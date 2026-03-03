import { useState, useEffect, useCallback } from 'react';
import { useWebSocket, type WebSocketMessage } from './useWebSocket';
import type { AgentOutput } from '../types/agent-output';

/**
 * Hook para suscribirse a outputs de un agente en tiempo real
 */
export function useAgentOutput(agentId: string, taskId?: string) {
  const [outputs, setOutputs] = useState<AgentOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Cargar outputs iniciales desde API
  useEffect(() => {
    const loadInitialOutputs = async () => {
      try {
        setLoading(true);
        // TODO: Implementar endpoint de outputs cuando esté disponible
        // const endpoint = taskId 
        //   ? `/tasks/${taskId}/output?limit=100`
        //   : `/agents/${agentId}/output?limit=100`;
        // const response = await fetch(endpoint);
        // const data = await response.json();
        
        setOutputs([]);
        setError(null);
      } catch (err) {
        console.error('Failed to load agent outputs:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialOutputs();
  }, [agentId, taskId]);

  // Suscribirse a updates en tiempo real via WebSocket
  const handleMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'agent:output') {
      const output = message.data as AgentOutput;
      
      // Filtrar por agentId y opcionalmente por taskId
      if (output.agentId === agentId && (!taskId || output.taskId === taskId)) {
        setOutputs(prev => [...prev, output]);
      }
    }
  }, [agentId, taskId]);

  useWebSocket({ onMessage: handleMessage });

  // Limpiar outputs
  const clearOutputs = useCallback(() => {
    setOutputs([]);
  }, []);

  return {
    outputs,
    loading,
    error,
    clearOutputs
  };
}
