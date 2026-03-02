import { FastifyInstance } from 'fastify';
import { AgentService } from '../services/AgentService';
import { StatusResponseSchema, ErrorResponseSchema } from '../schemas/common.schema';

export default async function statusRoutes(fastify: FastifyInstance) {
  const agentService = new AgentService();

  // GET /api/status - Get status of all agents
  fastify.get(
    '/status',
    {
      schema: {
        tags: ['Status'],
        description: 'Get health status of all agents',
        response: {
          200: StatusResponseSchema,
          500: ErrorResponseSchema
        }
      }
    },
    async (_request, reply) => {
      try {
        const statuses = await agentService.getAllAgentsStatus();

        return {
          ok: true,
          agents: statuses,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          ok: false,
          error: (error as Error).message
        });
      }
    }
  );
}
