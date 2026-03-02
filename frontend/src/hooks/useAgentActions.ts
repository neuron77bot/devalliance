import { useState } from 'react';
import { fetchAPI, ApiError } from '../lib/api-client';
import type { Agent } from '../types/api';

export interface CreateAgentData {
  name: string;
  role: string;
  description: string;
  capabilities?: string[];
  port?: number;
}

export interface UpdateAgentData {
  name?: string;
  role?: string;
  description?: string;
  capabilities?: string[];
}

export const useAgentActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Create a new agent
   */
  const createAgent = async (data: CreateAgentData): Promise<Agent | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchAPI<{ ok: boolean; agent: any }>('/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to create agent');
      }

      return response.agent;
    } catch (err) {
      const errorMsg = err instanceof ApiError 
        ? `Error ${err.status}: ${err.statusText}` 
        : (err as Error).message;
      
      setError(new Error(errorMsg));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update an existing agent
   */
  const updateAgent = async (id: string, data: UpdateAgentData): Promise<Agent | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchAPI<{ ok: boolean; agent: any }>(`/agents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to update agent');
      }

      return response.agent;
    } catch (err) {
      const errorMsg = err instanceof ApiError 
        ? `Error ${err.status}: ${err.statusText}` 
        : (err as Error).message;
      
      setError(new Error(errorMsg));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete an agent
   */
  const deleteAgent = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchAPI<{ ok: boolean; message?: string }>(`/agents/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete agent');
      }
    } catch (err) {
      const errorMsg = err instanceof ApiError 
        ? `Error ${err.status}: ${err.statusText}` 
        : (err as Error).message;
      
      setError(new Error(errorMsg));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Start an agent's container
   */
  const startAgent = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchAPI<{ ok: boolean; message?: string }>(`/agents/${id}/start`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to start agent');
      }
    } catch (err) {
      const errorMsg = err instanceof ApiError 
        ? `Error ${err.status}: ${err.statusText}` 
        : (err as Error).message;
      
      setError(new Error(errorMsg));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Stop an agent's container
   */
  const stopAgent = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchAPI<{ ok: boolean; message?: string }>(`/agents/${id}/stop`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to stop agent');
      }
    } catch (err) {
      const errorMsg = err instanceof ApiError 
        ? `Error ${err.status}: ${err.statusText}` 
        : (err as Error).message;
      
      setError(new Error(errorMsg));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Restart an agent's container
   */
  const restartAgent = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchAPI<{ ok: boolean; message?: string }>(`/agents/${id}/restart`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to restart agent');
      }
    } catch (err) {
      const errorMsg = err instanceof ApiError 
        ? `Error ${err.status}: ${err.statusText}` 
        : (err as Error).message;
      
      setError(new Error(errorMsg));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createAgent,
    updateAgent,
    deleteAgent,
    startAgent,
    stopAgent,
    restartAgent
  };
};
