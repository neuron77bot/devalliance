/**
 * Adapters para transformar respuestas del backend al formato del frontend
 */

import type { Agent, AgentStatus } from '../types/api';

/**
 * Estructura de respuesta del backend para GET /api/agents
 */
interface BackendAgentsResponse {
  ok: boolean;
  agents: Array<{
    id: string;
    name: string;
    role: string;
    description: string;
    capabilities: string[];
    status?: string;
    containerRunning?: boolean;
  }>;
}

/**
 * Estructura de respuesta del backend para GET /api/agents/:id/status
 */
interface BackendAgentStatusResponse {
  ok: boolean;
  agent?: {
    id: string;
    name: string;
    role: string;
    description: string;
    gateway: {
      url: string;
      token: string;
      healthUrl: string;
    };
    capabilities: string[];
  };
  health: {
    status: string;
    statusCode?: number;
  };
  gatewayStatus?: any;
}

/**
 * Mapea el status del backend al tipo AgentStatus del frontend
 */
function mapHealthStatus(healthStatus: string, statusCode?: number): AgentStatus {
  if (!statusCode || statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warning';
  if (healthStatus === 'healthy' || statusCode === 200) return 'healthy';
  return 'offline';
}

/**
 * Extrae el puerto de una URL
 */
function extractPort(url: string): number {
  try {
    const urlObj = new URL(url);
    return urlObj.port ? parseInt(urlObj.port, 10) : 80;
  } catch {
    return 80;
  }
}

/**
 * Transforma la respuesta del backend al tipo Agent del frontend
 * Usa el estado real del contenedor Docker
 */
export function adaptBackendAgentsResponse(response: BackendAgentsResponse): Agent[] {
  return response.agents.map((agent) => {
    // Mapear status del backend al tipo del frontend
    let status: AgentStatus = 'offline';
    if (agent.status === 'healthy') status = 'healthy';
    else if (agent.status === 'warning') status = 'warning';
    else if (agent.status === 'error') status = 'error';
    else if (agent.status === 'offline') status = 'offline';
    
    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      description: agent.description,
      capabilities: agent.capabilities,
      // Usar estado real del backend (desde Docker)
      status,
      gateway: {
        url: `ws://openclaw-${agent.id}:18789`,
        port: 18789,
      },
      metrics: {
        uptime: 0,
        tasksCompleted: 0,
        avgResponseTime: 0,
      },
    };
  });
}

/**
 * Transforma la respuesta de status detallada del backend
 */
export function adaptBackendAgentStatus(response: BackendAgentStatusResponse): Agent | null {
  if (!response.ok || !response.agent) {
    return null;
  }

  const agent = response.agent;
  const status = mapHealthStatus(response.health.status, response.health.statusCode);

  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    description: agent.description,
    capabilities: agent.capabilities,
    status,
    gateway: {
      url: agent.gateway.url,
      port: extractPort(agent.gateway.url),
    },
    metrics: {
      uptime: 0, // TODO: Obtener de gatewayStatus si está disponible
      tasksCompleted: 0,
      avgResponseTime: 0,
    },
  };
}
