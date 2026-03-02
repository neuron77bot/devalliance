import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTaskCard } from './SortableTaskCard';
import { useTaskWorkflow } from '../../hooks/useTaskWorkflow';
import type { Task, TaskStatus } from '../../types/task';

interface TaskColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function TaskColumn({ status, tasks, onTaskClick }: TaskColumnProps) {
  const { getStatusLabel, getStatusColor } = useTaskWorkflow();
  const { setNodeRef } = useDroppable({ id: status });

  const statusColor = getStatusColor(status);
  const taskIds = tasks.map(t => t._id);

  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${statusColor}`} />
          <h3 className="text-white font-semibold">
            {getStatusLabel(status)}
          </h3>
        </div>
        <span className="text-gray-400 text-sm bg-navy-800 px-2 py-1 rounded">
          {tasks.length}
        </span>
      </div>

      {/* Droppable Area */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="flex-1 space-y-3 p-2 bg-navy-900/30 rounded-lg min-h-[200px] overflow-y-auto"
        >
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              No tasks
            </div>
          ) : (
            tasks.map(task => (
              <SortableTaskCard
                key={task._id}
                task={task}
                onClick={() => onTaskClick(task)}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
