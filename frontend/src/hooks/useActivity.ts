import { useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '../lib/api-client';

export type ActivityType = 
  | 'agent_started'
  | 'agent_stopped'
  | 'agent_error'
  | 'task_created'
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'system_event';

export type ActivityLevel = 'info' | 'warning' | 'error' | 'success';

export interface Activity {
  _id: string;
  type: ActivityType;
  agentId?: string;
  taskId?: string;
  message: string;
  metadata?: any;
  level: ActivityLevel;
  timestamp: string;
}

export interface ActivityStats {
  total: number;
  byType: Record<string, number>;
  byLevel: Record<string, number>;
  last24h: number;
}

/**
 * Hook para obtener feed de actividad
 */
export function useActivity(options: {
  limit?: number;
  type?: string;
  agentId?: string;
  refreshInterval?: number;
} = {}) {
  const {
    limit = 100,
    type,
    agentId,
    refreshInterval = 10000 // Refresh cada 10 segundos
  } = options;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (type) params.append('type', type);
      if (agentId) params.append('agentId', agentId);

      const data = await fetchAPI<Activity[]>(`/activity?${params.toString()}`);
      setActivities(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [limit, type, agentId]);

  useEffect(() => {
    fetchActivities();

    // Refresh automático
    const interval = setInterval(fetchActivities, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchActivities, refreshInterval]);

  return { activities, loading, error, refresh: fetchActivities };
}

/**
 * Hook para obtener estadísticas de actividad
 */
export function useActivityStats() {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await fetchAPI<ActivityStats>('/activity/stats');
        setStats(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Refresh cada 30 segundos
    const interval = setInterval(fetchStats, 30000);

    return () => clearInterval(interval);
  }, []);

  return { stats, loading, error };
}

/**
 * Función para crear una actividad (para uso interno)
 */
export async function createActivity(
  type: ActivityType,
  message: string,
  options: {
    agentId?: string;
    taskId?: string;
    metadata?: any;
    level?: ActivityLevel;
  } = {}
): Promise<Activity> {
  return fetchAPI<Activity>('/activity', {
    method: 'POST',
    body: JSON.stringify({
      type,
      message,
      ...options
    })
  });
}
