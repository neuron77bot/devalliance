import { useState, useEffect, useCallback } from 'react';
import { useWebSocket, WebSocketMessage } from './useWebSocket';
import { fetchAPI } from './useApi';
import { TaskStatus } from '../types/task';
import { AgentOutput } from '../types/agent-output';

/**
 * Hook para gestionar ejecución de tareas en OpenClaw
 */
export function useTaskExecution(taskId: string) {
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const [output, setOutput] = useState<AgentOutput[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Cargar estado inicial de la tarea
  useEffect(() => {
    const loadTask = async () => {
      try {
        const task = await fetchAPI(`/tasks/${taskId}`);
        setStatus(task.status);
        
        // Cargar outputs existentes
        const outputResponse = await fetchAPI(`/tasks/${taskId}/output?limit=100`);
        setOutput(outputResponse.output || []);
        
        setIsExecuting(task.status === 'in_progress');
      } catch (err) {
        console.error('Failed to load task:', err);
        setError(err as Error);
      }
    };

    loadTask();
  }, [taskId]);

  // Suscribirse a updates en tiempo real
  const handleMessage = useCallback((message: WebSocketMessage) => {
    // Task status updates
    if (message.type === 'task_updated' && message.data?._id === taskId) {
      setStatus(message.data.status);
      setIsExecuting(message.data.status === 'in_progress');
    }

    // Agent output updates
    if (message.type === 'agent:output') {
      const outputData = message.data as AgentOutput;
      
      if (outputData.taskId === taskId) {
        setOutput(prev => [...prev, outputData]);
        
        // Update progress if available
        if (outputData.type === 'progress' && outputData.metadata?.progress) {
          setProgress(outputData.metadata.progress);
        }
      }
    }
  }, [taskId]);

  useWebSocket({ onMessage: handleMessage });

  // Iniciar ejecución
  const startExecution = useCallback(async () => {
    try {
      setIsExecuting(true);
      setError(null);
      
      const response = await fetchAPI(`/tasks/${taskId}/execute`, {
        method: 'POST'
      });
      
      console.log('Task execution started:', response);
      return response;
    } catch (err) {
      console.error('Failed to start execution:', err);
      setError(err as Error);
      setIsExecuting(false);
      throw err;
    }
  }, [taskId]);

  // Cancelar ejecución
  const cancelExecution = useCallback(async () => {
    try {
      setError(null);
      
      const response = await fetchAPI(`/tasks/${taskId}/cancel`, {
        method: 'POST'
      });
      
      setIsExecuting(false);
      console.log('Task execution cancelled:', response);
      return response;
    } catch (err) {
      console.error('Failed to cancel execution:', err);
      setError(err as Error);
      throw err;
    }
  }, [taskId]);

  // Limpiar output
  const clearOutput = useCallback(() => {
    setOutput([]);
    setProgress(0);
  }, []);

  return {
    status,
    progress,
    output,
    isExecuting,
    error,
    startExecution,
    cancelExecution,
    clearOutput
  };
}
