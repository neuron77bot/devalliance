import { FastifyInstance } from 'fastify';
import { HealthResponseSchema, ConfigResponseSchema } from '../schemas/common.schema';

export default async function healthRoutes(fastify: FastifyInstance) {
  // GET /health - Health check
  fastify.get(
    '/health',
    {
      schema: {
        tags: ['Health'],
        description: 'Service health check',
        response: {
          200: HealthResponseSchema
        }
      }
    },
    async () => {
      return {
        ok: true,
        service: 'mission-control',
        timestamp: new Date().toISOString()
      };
    }
  );

  // GET /config - Frontend config
  fastify.get(
    '/config',
    {
      schema: {
        tags: ['Config'],
        description: 'Get frontend configuration',
        response: {
          200: ConfigResponseSchema
        }
      }
    },
    async () => {
      return {
        baseUrl: process.env.BASE_URL || '',
        basePath: process.env.BASE_PATH || '',
        environment: process.env.NODE_ENV || 'development'
      };
    }
  );
}
