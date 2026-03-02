import { useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '../lib/api-client';

export interface SystemMetrics {
  totalAgents: number;
  activeAgents: number;
  inactiveAgents: number;
  totalTasks: number;
  tasksCompletedToday: number;
  tasksPending: number;
  tasksInProgress: number;
  tasksFailed: number;
  avgResponseTime: number;
  timestamp: Date;
}

export interface AgentMetrics {
  agentId: string;
  agentName: string;
  status: 'online' | 'offline' | 'error';
  cpu: number;
  memory: number;
  uptime: number;
  avgResponseTime: number;
  tasksCompleted: number;
  tasksFailed: number;
  lastActivity?: Date;
  history: {
    timestamp: Date;
    cpu: number;
    memory: number;
    responseTime: number;
  }[];
}

export interface ResponseTimeData {
  timestamp: Date;
  avgResponseTime: number;
}

/**
 * Hook para obtener métricas del sistema
 */
export function useSystemMetrics(refreshInterval = 5000) {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await fetchAPI<SystemMetrics>('/metrics/system');
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    
    // Refresh automático
    const interval = setInterval(fetchMetrics, refreshInterval);
    
    return () => clearInterval(interval);
  }, [fetchMetrics, refreshInterval]);

  return { metrics, loading, error, refresh: fetchMetrics };
}

/**
 * Hook para obtener métricas de todos los agentes
 */
export function useAgentMetrics(refreshInterval = 5000) {
  const [metrics, setMetrics] = useState<AgentMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await fetchAPI<AgentMetrics[]>('/metrics/agents');
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    
    const interval = setInterval(fetchMetrics, refreshInterval);
    
    return () => clearInterval(interval);
  }, [fetchMetrics, refreshInterval]);

  return { metrics, loading, error, refresh: fetchMetrics };
}

/**
 * Hook para obtener métricas de un agente específico
 */
export function useSingleAgentMetrics(agentId: string | null, refreshInterval = 5000) {
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!agentId) {
      setMetrics(null);
      setLoading(false);
      return;
    }

    try {
      const data = await fetchAPI<AgentMetrics>(`/metrics/agents/${agentId}`);
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchMetrics();
    
    if (agentId) {
      const interval = setInterval(fetchMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchMetrics, agentId, refreshInterval]);

  return { metrics, loading, error, refresh: fetchMetrics };
}

/**
 * Hook para obtener historial de response time
 */
export function useResponseTimeHistory() {
  const [history, setHistory] = useState<ResponseTimeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await fetchAPI<ResponseTimeData[]>('/metrics/response-time');
        setHistory(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
    
    // Refresh cada 30 segundos
    const interval = setInterval(fetchHistory, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { history, loading, error };
}
