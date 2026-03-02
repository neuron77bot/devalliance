import { useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '../lib/api-client';

export interface Task {
  _id: string;
  title: string;
  description: string;
  assignedTo?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  result?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook para obtener lista de tareas
 */
export function useTasks(filters?: { status?: string; assignedTo?: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      // Construir query string
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
      
      const queryString = params.toString();
      const endpoint = queryString ? `/tasks?${queryString}` : '/tasks';
      
      const data = await fetchAPI<Task[]>(endpoint);
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [filters?.status, filters?.assignedTo]);

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

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      setLoading(false);
      return;
    }

    const fetchTask = async () => {
      try {
        const data = await fetchAPI<Task>(`/tasks/${taskId}`);
        setTask(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId]);

  return { task, loading, error };
}

/**
 * Hook para acciones de tareas (crear, actualizar, eliminar)
 */
export function useTaskActions() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createTask = async (taskData: Partial<Task>) => {
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

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
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

  return { createTask, updateTask, deleteTask, submitting, error };
}

/**
 * Hook para estadísticas de tareas
 */
export function useTaskStats() {
  const { tasks, loading, error } = useTasks();

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
    byPriority: {
      low: tasks.filter(t => t.priority === 'low').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      high: tasks.filter(t => t.priority === 'high').length,
      critical: tasks.filter(t => t.priority === 'critical').length,
    }
  };

  return { stats, loading, error };
}
