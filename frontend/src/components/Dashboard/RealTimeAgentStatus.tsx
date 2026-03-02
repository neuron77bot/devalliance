import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket, WebSocketMessage } from '../../hooks/useWebSocket';
import { AgentStatus } from '../../types/agent-output';
import { fetchAPI } from '../../hooks/useApi';

interface RealTimeAgentStatusProps {
  agentId: string;
  showMetrics?: boolean;
}

export function RealTimeAgentStatus({ agentId, showMetrics = false }: RealTimeAgentStatusProps) {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar status inicial
  useEffect(() => {
    const loadStatus = async () => {
      try {
        setLoading(true);
        const response = await fetchAPI(`/agents/${agentId}/status`);
        setStatus(response.status);
      } catch (err) {
        console.error('Failed to load agent status:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
  }, [agentId]);

  // Suscribirse a updates en tiempo real
  const handleMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'agent:status') {
      const statusUpdate = message.data as AgentStatus;
      if (statusUpdate.agentId === agentId) {
        setStatus(statusUpdate);
      }
    }
  }, [agentId]);

  useWebSocket({ onMessage: handleMessage });

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-gray-500 rounded-full" />
        <span className="text-sm text-gray-400">Unknown</span>
      </div>
    );
  }

  // Get status color and icon
  const getStatusDisplay = (s: string) => {
    switch (s) {
      case 'healthy':
        return {
          color: 'bg-green-500',
          icon: '✅',
          label: 'Healthy',
          textColor: 'text-green-500'
        };
      case 'offline':
        return {
          color: 'bg-gray-500',
          icon: '⏸️',
          label: 'Offline',
          textColor: 'text-gray-400'
        };
      case 'error':
        return {
          color: 'bg-red-500',
          icon: '❌',
          label: 'Error',
          textColor: 'text-red-500'
        };
      default:
        return {
          color: 'bg-yellow-500',
          icon: '⚠️',
          label: 'Unknown',
          textColor: 'text-yellow-500'
        };
    }
  };

  const display = getStatusDisplay(status.status);

  // Format uptime
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-2">
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${display.color} ${status.status === 'healthy' ? 'animate-pulse' : ''}`} />
        <span className="text-sm font-medium text-white">{display.label}</span>
        
        {!status.containerRunning && (
          <span className="text-xs text-gray-400">(Container stopped)</span>
        )}
        
        {status.containerRunning && !status.gatewayConnected && (
          <span className="text-xs text-gray-400">(Gateway disconnected)</span>
        )}
      </div>

      {/* Metrics */}
      {showMetrics && status.metrics && status.status === 'healthy' && (
        <div className="flex gap-4 text-xs text-gray-400">
          {status.metrics.cpu !== undefined && (
            <div className="flex items-center gap-1">
              <span>CPU:</span>
              <span className={status.metrics.cpu > 80 ? 'text-red-400' : 'text-white'}>
                {status.metrics.cpu.toFixed(1)}%
              </span>
            </div>
          )}
          
          {status.metrics.memory !== undefined && (
            <div className="flex items-center gap-1">
              <span>RAM:</span>
              <span className={status.metrics.memory > 80 ? 'text-red-400' : 'text-white'}>
                {status.metrics.memory.toFixed(1)}%
              </span>
            </div>
          )}
          
          {status.metrics.uptime !== undefined && (
            <div className="flex items-center gap-1">
              <span>⏱️</span>
              <span className="text-white">{formatUptime(status.metrics.uptime)}</span>
            </div>
          )}
        </div>
      )}

      {/* Response Time */}
      {status.responseTime !== undefined && (
        <div className="text-xs text-gray-400">
          Response: {status.responseTime}ms
        </div>
      )}

      {/* Last Sync */}
      {status.lastSync && (
        <div className="text-xs text-gray-500">
          Last sync: {new Date(status.lastSync).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
