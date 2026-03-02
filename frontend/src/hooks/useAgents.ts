import { useState, useEffect } from 'react';
import type { Agent } from '../types/api';
import { fetchAPI, ApiError } from '../lib/api-client';
import { adaptBackendAgentsResponse } from '../lib/api-adapters';
// import { mockAgents } from '../mocks/agents'; // Comentado: Ya no usa datos mock

/**
 * Hook para obtener la lista de agentes desde el backend real
 * Consume /app/api/agents via proxy Nginx
 */
export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Llamada real a la API
      // El backend retorna: { ok: boolean, agents: [...] }
      const response = await fetchAPI<{ ok: boolean; agents: any[] }>('/agents');
      
      // Transformar respuesta del backend al formato del frontend
      const adaptedAgents = adaptBackendAgentsResponse(response);
      setAgents(adaptedAgents);
    } catch (err) {
      // Manejo específico de errores HTTP
      if (err instanceof ApiError) {
        console.error(`API Error ${err.status}:`, err.message);
        setError(new Error(`Error ${err.status}: ${err.statusText}`));
      } else {
        console.error('Unexpected error:', err);
        setError(err as Error);
      }
      
      // En caso de error, mantener array vacío
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const getAgentById = (id: string): Agent | undefined => {
    return agents.find(agent => agent.id === id);
  };

  const getActiveAgents = (): Agent[] => {
    return agents.filter(agent => agent.status === 'healthy');
  };

  return {
    agents,
    loading,
    error,
    refetch: fetchAgents,
    getAgentById,
    getActiveAgents
  };
};
