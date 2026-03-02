import { useState, useEffect } from 'react';
import type { Agent } from '../types/api';
import { mockAgents } from '../mocks/agents';

/**
 * Hook para obtener la lista de agentes
 * Actualmente usa datos mock, preparado para integración con API real
 */
export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Simular delay de red
    const fetchAgents = async () => {
      try {
        setLoading(true);
        
        // TODO: Reemplazar con llamada real a la API
        // const response = await fetch('/api/agents');
        // const data = await response.json();
        // setAgents(data);
        
        // Simulación de delay de red
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setAgents(mockAgents);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

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
    getAgentById,
    getActiveAgents
  };
};
