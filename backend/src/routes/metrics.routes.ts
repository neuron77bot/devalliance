import { FastifyInstance } from 'fastify';
import { metricsService } from '../services/MetricsService';

export default async function metricsRoutes(fastify: FastifyInstance) {
  
  /**
   * GET /api/metrics/system - Métricas globales del sistema
   */
  fastify.get('/metrics/system', {
    schema: {
      description: 'Get system-wide metrics',
      tags: ['Metrics'],
      response: {
        200: {
          description: 'System metrics',
          type: 'object',
          properties: {
            totalAgents: { type: 'number' },
            activeAgents: { type: 'number' },
            inactiveAgents: { type: 'number' },
            totalTasks: { type: 'number' },
            tasksCompletedToday: { type: 'number' },
            tasksPending: { type: 'number' },
            tasksInProgress: { type: 'number' },
            tasksFailed: { type: 'number' },
            avgResponseTime: { type: 'number' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, async (_request, reply) => {
    try {
      const metrics = await metricsService.getSystemMetrics();
      return reply.send(metrics);
    } catch (err) {
      fastify.log.error({ error: err }, 'Error getting system metrics');
      return (reply as any).status(500).send({ error: 'Failed to get system metrics' } as any);
    }
  });

  /**
   * GET /api/metrics/agents - Métricas de todos los agentes
   */
  fastify.get('/metrics/agents', {
    schema: {
      description: 'Get metrics for all agents',
      tags: ['Metrics'],
      response: {
        200: {
          description: 'Array of agent metrics',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              agentId: { type: 'string' },
              agentName: { type: 'string' },
              status: { type: 'string', enum: ['online', 'offline', 'error'] },
              cpu: { type: 'number' },
              memory: { type: 'number' },
              uptime: { type: 'number' },
              avgResponseTime: { type: 'number' },
              tasksCompleted: { type: 'number' },
              tasksFailed: { type: 'number' }
            }
          }
        }
      }
    }
  }, async (_request, reply) => {
    try {
      const metrics = await metricsService.getAllAgentMetrics();
      return reply.send(metrics);
    } catch (err) {
      fastify.log.error({ error: err }, 'Error getting agent metrics');
      return (reply as any).status(500).send({ error: 'Failed to get agent metrics' } as any);
    }
  });

  /**
   * GET /api/metrics/agents/:id - Métricas de un agente específico
   */
  fastify.get<{ Params: { id: string } }>('/metrics/agents/:id', {
    schema: {
      description: 'Get metrics for a specific agent',
      tags: ['Metrics'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      response: {
        200: {
          description: 'Agent metrics with history',
          type: 'object',
          properties: {
            agentId: { type: 'string' },
            agentName: { type: 'string' },
            status: { type: 'string' },
            cpu: { type: 'number' },
            memory: { type: 'number' },
            uptime: { type: 'number' },
            avgResponseTime: { type: 'number' },
            tasksCompleted: { type: 'number' },
            tasksFailed: { type: 'number' },
            lastActivity: { type: 'string' },
            history: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  timestamp: { type: 'string' },
                  cpu: { type: 'number' },
                  memory: { type: 'number' },
                  responseTime: { type: 'number' }
                }
              }
            }
          }
        },
        404: {
          description: 'Agent not found',
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const metrics = await metricsService.getAgentMetrics(id);
      
      if (!metrics) {
        return reply.status(404).send({ error: 'Agent not found' });
      }
      
      return reply.send(metrics);
    } catch (err) {
      fastify.log.error({ error: err }, 'Error getting agent metrics');
      return (reply as any).status(500).send({ error: 'Failed to get agent metrics' } as any);
    }
  });

  /**
   * GET /api/metrics/response-time - Historial de response time
   */
  fastify.get('/metrics/response-time', {
    schema: {
      description: 'Get response time history',
      tags: ['Metrics'],
      response: {
        200: {
          description: 'Response time history',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              timestamp: { type: 'string' },
              avgResponseTime: { type: 'number' }
            }
          }
        }
      }
    }
  }, async (_request, reply) => {
    try {
      const history = metricsService.getResponseTimeHistory();
      return reply.send(history);
    } catch (err) {
      fastify.log.error({ error: err }, 'Error getting response time history');
      return (reply as any).status(500).send({ error: 'Failed to get response time history' } as any);
    }
  });
}
