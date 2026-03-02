import { useState, useEffect, useCallback, useRef } from 'react';

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
}

export interface UseWebSocketOptions {
  url?: string;
  reconnectInterval?: number;
  reconnectAttempts?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

/**
 * Hook para manejar conexiones WebSocket con reconexión automática
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = getWebSocketUrl(),
    reconnectInterval = 3000,
    reconnectAttempts = 10,
    onMessage,
    onOpen,
    onClose,
    onError
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Función para obtener WebSocket URL
  function getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const apiPath = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '/app';
    return `${protocol}//${host}${apiPath}/ws`;
  }

  // Conectar WebSocket
  const connect = useCallback(() => {
    try {
      // Cerrar conexión existente si hay
      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectCountRef.current = 0;
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          onMessage?.(message);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError(new Error('WebSocket error'));
        onError?.(event);
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setIsConnected(false);
        onClose?.();

        // Intentar reconectar
        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          console.log(`🔄 Reconnecting... (${reconnectCountRef.current}/${reconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          console.error('❌ Max reconnection attempts reached');
          setError(new Error('Failed to connect to WebSocket'));
        }
      };
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError(err as Error);
    }
  }, [url, reconnectInterval, reconnectAttempts, onMessage, onOpen, onClose, onError]);

  // Enviar mensaje
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  // Desconectar manualmente
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Conectar al montar
  useEffect(() => {
    connect();

    // Cleanup al desmontar
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Ping periódico para mantener conexión viva
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(() => {
      sendMessage({ type: 'ping' });
    }, 30000); // Cada 30 segundos

    return () => clearInterval(pingInterval);
  }, [isConnected, sendMessage]);

  return {
    isConnected,
    lastMessage,
    error,
    sendMessage,
    disconnect,
    reconnect: connect
  };
}

/**
 * Hook específico para métricas en tiempo real via WebSocket
 */
export function useMetricsWebSocket(
  onMetricsUpdate?: (data: any) => void
) {
  const [metricsData, setMetricsData] = useState<any>(null);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'metrics_update') {
      setMetricsData(message.data);
      onMetricsUpdate?.(message.data);
    }
  }, [onMetricsUpdate]);

  const { isConnected, error } = useWebSocket({
    onMessage: handleMessage
  });

  return { isConnected, metricsData, error };
}
