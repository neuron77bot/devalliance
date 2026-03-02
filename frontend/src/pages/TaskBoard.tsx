import { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { Plus, Search, Filter, RefreshCw } from 'lucide-react';
import { useTasks, useTaskActions } from '../hooks/useTasks';
import { TaskColumn } from '../components/TaskBoard/TaskColumn';
import { TaskCard } from '../components/TaskBoard/TaskCard';
import { TaskDetailModal } from '../components/TaskBoard/TaskDetailModal';
import { TaskCreationForm } from '../components/TaskBoard/TaskCreationForm';
import type { Task, TaskStatus, TaskPriority } from '../types/task';

const COLUMN_ORDER: TaskStatus[] = ['pending', 'assigned', 'in_progress', 'paused', 'completed', 'failed', 'cancelled'];

export function TaskBoard() {
  const [filters, setFilters] = useState({
    search: '',
    priority: '' as TaskPriority | '',
    status: '' as TaskStatus | ''
  });

  const { tasks, loading, refresh } = useTasks();
  const { changeStatus } = useTaskActions();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    return tasks.filter(task => {
      if (filters.search) {
        const search = filters.search.toLowerCase();
        if (!task.title.toLowerCase().includes(search) && 
            !task.description.toLowerCase().includes(search)) {
          return false;
        }
      }
      if (filters.priority && task.priority !== filters.priority) {
        return false;
      }
      if (filters.status && task.status !== filters.status) {
        return false;
      }
      return true;
    });
  }, [tasks, filters]);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      pending: [],
      assigned: [],
      in_progress: [],
      paused: [],
      completed: [],
      failed: [],
      cancelled: []
    };

    filteredTasks.forEach(task => {
      grouped[task.status].push(task);
    });

    return grouped;
  }, [filteredTasks]);

  const handleDragStart = (event: any) => {
    setActiveTaskId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTaskId(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    const task = Array.isArray(tasks) ? tasks.find(t => t._id === taskId) : undefined;

    if (task && task.status !== newStatus) {
      try {
        await changeStatus(taskId, { status: newStatus });
        refresh();
      } catch (err) {
        console.error('Error changing task status:', err);
      }
    }
  };

  const activeTask = activeTaskId && Array.isArray(tasks) ? tasks.find(t => t._id === activeTaskId) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Task Board</h1>
          <p className="text-gray-400">Manage and track all tasks</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={refresh}
            className="bg-navy-800 hover:bg-navy-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            Create Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-navy-900 border border-navy-700 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value as TaskPriority | '' }))}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-cyan-500 appearance-none"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as TaskStatus | '' }))}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-cyan-500 appearance-none"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-navy-700">
          <div className="text-sm">
            <span className="text-gray-400">Total:</span>{' '}
            <span className="text-white font-semibold">{filteredTasks.length}</span>
          </div>
          {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
            statusTasks.length > 0 && (
              <div key={status} className="text-sm">
                <span className="text-gray-400 capitalize">{status.replace('_', ' ')}:</span>{' '}
                <span className="text-white font-semibold">{statusTasks.length}</span>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {COLUMN_ORDER.map(status => (
            <div key={status} className="min-h-[600px]">
              <TaskColumn
                status={status}
                tasks={tasksByStatus[status]}
                onTaskClick={setSelectedTask}
              />
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="rotate-3">
              <TaskCard task={activeTask} onClick={() => {}} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onUpdate={() => {
              refresh();
              // Update selected task
              if (Array.isArray(tasks)) {
                const updated = tasks.find(t => t._id === selectedTask._id);
                if (updated) setSelectedTask(updated);
              }
            }}
          />
        )}

        {showCreateForm && (
          <TaskCreationForm
            onClose={() => setShowCreateForm(false)}
            onSuccess={() => refresh()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
