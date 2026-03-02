import { useMemo } from 'react';
import type { TaskStatus, Task } from '../types/task';

interface StateTransition {
  from: TaskStatus;
  to: TaskStatus;
  label: string;
  color: string;
}

interface WorkflowInfo {
  validTransitions: TaskStatus[];
  availableActions: StateTransition[];
  canTransitionTo: (status: TaskStatus) => boolean;
  getStatusColor: (status: TaskStatus) => string;
  getStatusLabel: (status: TaskStatus) => string;
  getPriorityColor: (priority: string) => string;
  getPriorityLabel: (priority: string) => string;
}

/**
 * Hook para manejar la lógica de workflow de tareas
 */
export function useTaskWorkflow(currentStatus?: TaskStatus): WorkflowInfo {
  // Definir transiciones válidas
  const stateTransitions: Record<TaskStatus, TaskStatus[]> = useMemo(() => ({
    pending: ['assigned', 'cancelled'],
    assigned: ['in_progress', 'pending', 'cancelled'],
    in_progress: ['paused', 'completed', 'failed', 'cancelled'],
    paused: ['in_progress', 'cancelled'],
    completed: [], // terminal state
    failed: ['pending', 'cancelled'], // can retry
    cancelled: [] // terminal state
  }), []);

  const validTransitions = useMemo(() => {
    return currentStatus ? stateTransitions[currentStatus] : [];
  }, [currentStatus, stateTransitions]);

  const availableActions = useMemo(() => {
    if (!currentStatus) return [];

    const transitions: StateTransition[] = validTransitions.map(to => {
      let label = '';
      let color = '';

      switch (to) {
        case 'assigned':
          label = 'Assign';
          color = 'blue';
          break;
        case 'in_progress':
          label = 'Start';
          color = 'green';
          break;
        case 'paused':
          label = 'Pause';
          color = 'yellow';
          break;
        case 'completed':
          label = 'Complete';
          color = 'emerald';
          break;
        case 'failed':
          label = 'Mark as Failed';
          color = 'red';
          break;
        case 'cancelled':
          label = 'Cancel';
          color = 'gray';
          break;
        case 'pending':
          label = 'Reset to Pending';
          color = 'slate';
          break;
      }

      return { from: currentStatus, to, label, color };
    });

    return transitions;
  }, [currentStatus, validTransitions]);

  const canTransitionTo = (status: TaskStatus): boolean => {
    return validTransitions.includes(status);
  };

  const getStatusColor = (status: TaskStatus): string => {
    const colors: Record<TaskStatus, string> = {
      pending: 'bg-slate-500',
      assigned: 'bg-blue-500',
      in_progress: 'bg-green-500',
      paused: 'bg-yellow-500',
      completed: 'bg-emerald-500',
      failed: 'bg-red-500',
      cancelled: 'bg-gray-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusLabel = (status: TaskStatus): string => {
    const labels: Record<TaskStatus, string> = {
      pending: 'Pending',
      assigned: 'Assigned',
      in_progress: 'In Progress',
      paused: 'Paused',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
      low: 'text-blue-400',
      medium: 'text-yellow-400',
      high: 'text-orange-400',
      urgent: 'text-red-400'
    };
    return colors[priority] || 'text-gray-400';
  };

  const getPriorityLabel = (priority: string): string => {
    const labels: Record<string, string> = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent'
    };
    return labels[priority] || priority;
  };

  return {
    validTransitions,
    availableActions,
    canTransitionTo,
    getStatusColor,
    getStatusLabel,
    getPriorityColor,
    getPriorityLabel
  };
}

/**
 * Hook para calcular estadísticas y métricas de tareas
 */
export function useTaskMetrics(tasks: Task[]) {
  const metrics = useMemo(() => {
    const now = new Date();

    // Contar por estado
    const byStatus = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Contar por prioridad
    const byPriority = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calcular tiempo promedio de completación
    const completedTasks = tasks.filter(t => t.status === 'completed' && t.actualDuration);
    const avgCompletionTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => sum + (t.actualDuration || 0), 0) / completedTasks.length
      : null;

    // Tareas vencidas (estimatedDuration excedido)
    const overdueTasks = tasks.filter(task => {
      if (task.status === 'completed' || task.status === 'cancelled') return false;
      if (!task.estimatedDuration || !task.startedAt) return false;

      const startTime = new Date(task.startedAt).getTime();
      const elapsedMinutes = (now.getTime() - startTime) / 60000;
      return elapsedMinutes > task.estimatedDuration;
    });

    // Tareas bloqueadas por dependencias
    const blockedTasks = tasks.filter(task => {
      if (task.status !== 'pending' || !task.dependencies || task.dependencies.length === 0) {
        return false;
      }

      // Check if any dependency is not completed
      const deps = tasks.filter(t => task.dependencies.includes(t._id));
      return deps.some(d => d.status !== 'completed');
    });

    return {
      total: tasks.length,
      byStatus,
      byPriority,
      avgCompletionTime,
      overdueTasks: overdueTasks.length,
      blockedTasks: blockedTasks.length,
      completionRate: tasks.length > 0 
        ? ((byStatus.completed || 0) / tasks.length) * 100 
        : 0
    };
  }, [tasks]);

  return metrics;
}

/**
 * Hook para ordenar y filtrar tareas
 */
export function useTaskFiltering() {
  const sortTasks = (tasks: Task[], sortBy: 'priority' | 'created' | 'updated' | 'status', order: 'asc' | 'desc' = 'desc') => {
    const sorted = [...tasks];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'priority': {
          const priorityWeight: Record<string, number> = {
            urgent: 4,
            high: 3,
            medium: 2,
            low: 1
          };
          comparison = priorityWeight[b.priority] - priorityWeight[a.priority];
          break;
        }
        case 'created':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case 'updated':
          comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return order === 'asc' ? -comparison : comparison;
    });

    return sorted;
  };

  const filterTasks = (tasks: Task[], filters: {
    status?: TaskStatus | TaskStatus[];
    priority?: string | string[];
    assignedTo?: string;
    search?: string;
    tags?: string[];
  }) => {
    let filtered = [...tasks];

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      filtered = filtered.filter(t => statuses.includes(t.status));
    }

    if (filters.priority) {
      const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
      filtered = filtered.filter(t => priorities.includes(t.priority));
    }

    if (filters.assignedTo) {
      filtered = filtered.filter(t => t.assignedTo === filters.assignedTo);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(search) || 
        t.description.toLowerCase().includes(search)
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(t => 
        filters.tags!.some(tag => t.tags.includes(tag))
      );
    }

    return filtered;
  };

  return { sortTasks, filterTasks };
}
