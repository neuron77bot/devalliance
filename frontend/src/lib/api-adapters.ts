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
 * Agrega valores por defecto para campos faltantes
 */
export function adaptBackendAgentsResponse(response: BackendAgentsResponse): Agent[] {
  return response.agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    description: agent.description,
    capabilities: agent.capabilities,
    // Valores por defecto para campos no incluidos en la respuesta básica
    status: 'healthy' as AgentStatus, // Asumimos healthy por defecto
    gateway: {
      url: `ws://openclaw-${agent.id}:18789`, // URL por defecto
      port: 18789, // Puerto por defecto
    },
    metrics: {
      uptime: 0,
      tasksCompleted: 0,
      avgResponseTime: 0,
    },
  }));
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
