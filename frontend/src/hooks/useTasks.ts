import { useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '../lib/api-client';
import type { 
  Task, 
  TaskStats, 
  CreateTaskInput, 
  UpdateTaskInput, 
  TaskFilters,
  HandoffRequest,
  CommentInput,
  StatusChangeInput,
  Interaction,
  QueueStats
} from '../types/task';

/**
 * Hook para obtener lista de tareas con filtros
 */
export function useTasks(filters?: TaskFilters) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      // Construir query string
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.priority) params.append('priority', filters.priority);
      if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.tags) params.append('tags', filters.tags.join(','));
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.skip) params.append('skip', filters.skip.toString());
      
      const queryString = params.toString();
      const endpoint = queryString ? `/tasks?${queryString}` : '/tasks';
      
      const data = await fetchAPI<Task[] | { tasks: Task[] }>(endpoint);
      // Handle both array and object response formats
      const tasksArray = Array.isArray(data) ? data : (data as any).tasks || [];
      setTasks(tasksArray);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [
    filters?.status, 
    filters?.priority, 
    filters?.assignedTo, 
    filters?.search, 
    filters?.tags?.join(','),
    filters?.limit,
    filters?.skip
  ]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, refresh: fetchTasks };
}

/**
 * Hook para obtener una tarea específica
 */
export function useTask(taskId: string | null) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTask = useCallback(async () => {
    if (!taskId) {
      setTask(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await fetchAPI<Task>(`/tasks/${taskId}`);
      setTask(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  return { task, loading, error, refresh: fetchTask };
}

/**
 * Hook para acciones de tareas (crear, actualizar, eliminar)
 */
export function useTaskActions() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createTask = async (taskData: CreateTaskInput) => {
    setSubmitting(true);
    setError(null);
    
    try {
      const newTask = await fetchAPI<Task>('/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData)
      });
      return newTask;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const updateTask = async (taskId: string, updates: UpdateTaskInput) => {
    setSubmitting(true);
    setError(null);
    
    try {
      const updatedTask = await fetchAPI<Task>(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      return updatedTask;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const deleteTask = async (taskId: string) => {
    setSubmitting(true);
    setError(null);
    
    try {
      await fetchAPI(`/tasks/${taskId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (taskId: string, statusData: StatusChangeInput) => {
    setSubmitting(true);
    setError(null);
    
    try {
      const updatedTask = await fetchAPI<Task>(`/tasks/${taskId}/status`, {
        method: 'PUT',
        body: JSON.stringify(statusData)
      });
      return updatedTask;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const assignTask = async (taskId: string, agentId: string) => {
    setSubmitting(true);
    setError(null);
    
    try {
      const updatedTask = await fetchAPI<Task>(`/tasks/${taskId}/assign`, {
        method: 'PUT',
        body: JSON.stringify({ agentId })
      });
      return updatedTask;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handoffTask = async (taskId: string, handoffData: HandoffRequest) => {
    setSubmitting(true);
    setError(null);
    
    try {
      const result = await fetchAPI<{ task: Task; interaction: Interaction }>(`/tasks/${taskId}/handoff`, {
        method: 'POST',
        body: JSON.stringify(handoffData)
      });
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const acceptHandoff = async (taskId: string, agentId: string) => {
    setSubmitting(true);
    setError(null);
    
    try {
      const updatedTask = await fetchAPI<Task>(`/tasks/${taskId}/accept-handoff`, {
        method: 'POST',
        body: JSON.stringify({ agentId })
      });
      return updatedTask;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const addComment = async (taskId: string, commentData: CommentInput) => {
    setSubmitting(true);
    setError(null);
    
    try {
      const interaction = await fetchAPI<Interaction>(`/tasks/${taskId}/comment`, {
        method: 'POST',
        body: JSON.stringify(commentData)
      });
      return interaction;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const executeTask = async (taskId: string) => {
    setSubmitting(true);
    setError(null);
    
    try {
      const result = await fetchAPI<{ success: boolean; taskId: string; message: string; result: any }>(`/tasks/${taskId}/execute`, {
        method: 'POST'
      });
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return { 
    createTask, 
    updateTask, 
    deleteTask, 
    changeStatus,
    assignTask,
    handoffTask,
    acceptHandoff,
    addComment,
    executeTask,
    submitting, 
    error 
  };
}

/**
 * Hook para obtener interacciones de una tarea
 */
export function useTaskInteractions(taskId: string | null) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchInteractions = useCallback(async () => {
    if (!taskId) {
      setInteractions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await fetchAPI<Interaction[]>(`/tasks/${taskId}/interactions`);
      setInteractions(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  return { interactions, loading, error, refresh: fetchInteractions };
}

/**
 * Hook para estadísticas globales de tareas
 */
export function useTaskStats() {
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAPI<TaskStats>('/tasks/stats/global');
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refresh: fetchStats };
}

/**
 * Hook para cola de un agente
 */
export function useAgentQueue(agentId: string | null) {
  const [queue, setQueue] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchQueue = useCallback(async () => {
    if (!agentId) {
      setQueue([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await fetchAPI<Task[]>(`/tasks/queue/${agentId}`);
      setQueue(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return { queue, loading, error, refresh: fetchQueue };
}

/**
 * Hook para estadísticas globales de cola
 */
export function useQueueStats() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAPI<QueueStats>('/tasks/queue/stats/global');
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refresh: fetchStats };
}
