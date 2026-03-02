import { FastifyInstance } from 'fastify';
import { ActivityModel, ActivityType } from '../models/Activity.model';

export default async function activityRoutes(fastify: FastifyInstance) {
  
  /**
   * GET /api/activity - Stream de actividad reciente
   */
  fastify.get('/activity', {
    schema: {
      description: 'Get recent activity feed',
      tags: ['Activity'],
      querystring: {
        type: 'object',
        properties: {
          limit: { 
            type: 'number', 
            default: 100,
            description: 'Maximum number of activities to return'
          },
          type: { 
            type: 'string',
            description: 'Filter by activity type'
          },
          agentId: { 
            type: 'string',
            description: 'Filter by agent ID'
          }
        }
      },
      response: {
        200: {
          description: 'Activity feed',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              type: { type: 'string' },
              agentId: { type: 'string' },
              taskId: { type: 'string' },
              message: { type: 'string' },
              metadata: { type: 'object' },
              level: { type: 'string' },
              timestamp: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (_request, reply) => {
    try {
      const { limit = 100, type, agentId } = _request.query as any;
      
      // Construir query
      const query: any = {};
      if (type) query.type = type;
      if (agentId) query.agentId = agentId;
      
      const activities = await ActivityModel
        .find(query)
        .sort({ timestamp: -1 })
        .limit(Math.min(limit, 200)) // Máximo 200
        .lean();
      
      return reply.send(activities);
    } catch (err) {
      fastify.log.error({ error: err }, 'Error getting activity feed');
      return (reply as any).status(500).send({ error: 'Failed to get activity feed' } as any);
    }
  });

  /**
   * POST /api/activity - Crear evento de actividad (interno)
   */
  fastify.post<{
    Body: {
      type: ActivityType;
      agentId?: string;
      taskId?: string;
      message: string;
      metadata?: any;
      level?: 'info' | 'warning' | 'error' | 'success';
    }
  }>('/activity', {
    schema: {
      description: 'Create a new activity event',
      tags: ['Activity'],
      body: {
        type: 'object',
        required: ['type', 'message'],
        properties: {
          type: { 
            type: 'string',
            enum: [
              'agent_started',
              'agent_stopped',
              'agent_error',
              'task_created',
              'task_started',
              'task_completed',
              'task_failed',
              'system_event'
            ]
          },
          agentId: { type: 'string' },
          taskId: { type: 'string' },
          message: { type: 'string' },
          metadata: { type: 'object' },
          level: { 
            type: 'string',
            enum: ['info', 'warning', 'error', 'success'],
            default: 'info'
          }
        }
      },
      response: {
        201: {
          description: 'Activity created',
          type: 'object',
          properties: {
            _id: { type: 'string' },
            type: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const activity = await ActivityModel.create({
        ...request.body,
        timestamp: new Date()
      });
      
      // Broadcast via WebSocket (si está conectado)
      if (fastify.websocketClients) {
        fastify.websocketClients.forEach(client => {
          if (client.readyState === 1) { // OPEN
            client.send(JSON.stringify({
              type: 'activity_update',
              data: activity
            }));
          }
        });
      }
      
      return reply.status(201).send(activity);
    } catch (err) {
      fastify.log.error({ error: err }, 'Error creating activity');
      return (reply as any).status(500).send({ error: 'Failed to create activity' } as any);
    }
  });

  /**
   * GET /api/activity/stats - Estadísticas de actividad
   */
  fastify.get('/activity/stats', {
    schema: {
      description: 'Get activity statistics',
      tags: ['Activity'],
      response: {
        200: {
          description: 'Activity statistics',
          type: 'object',
          properties: {
            total: { type: 'number' },
            byType: { type: 'object' },
            byLevel: { type: 'object' },
            last24h: { type: 'number' }
          }
        }
      }
    }
  }, async (_request, reply) => {
    try {
      const total = await ActivityModel.countDocuments();
      
      // Stats por tipo
      const byType = await ActivityModel.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]);
      
      // Stats por nivel
      const byLevel = await ActivityModel.aggregate([
        { $group: { _id: '$level', count: { $sum: 1 } } }
      ]);
      
      // Últimas 24 horas
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const last24h = await ActivityModel.countDocuments({
        timestamp: { $gte: yesterday }
      });
      
      return reply.send({
        total,
        byType: byType.reduce((acc: any, curr: any) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        byLevel: byLevel.reduce((acc: any, curr: any) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        last24h
      });
    } catch (err) {
      fastify.log.error({ error: err }, 'Error getting activity stats');
      return (reply as any).status(500).send({ error: 'Failed to get activity stats' } as any);
    }
  });
}
