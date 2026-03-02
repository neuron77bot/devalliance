import { FastifyInstance } from 'fastify';
import { AgentService } from '../services/AgentService';
import {
  AgentListResponseSchema,
  AgentStatusResponseSchema,
  RpcCallBodySchema,
  RpcCallResponseSchema
} from '../schemas/agent.schema';
import { ErrorResponseSchema } from '../schemas/common.schema';

export default async function agentRoutes(fastify: FastifyInstance) {
  const agentService = new AgentService();

  // GET /api/agents - List all agents
  fastify.get(
    '/agents',
    {
      schema: {
        tags: ['Agents'],
        description: 'Get all agents',
        response: {
          200: AgentListResponseSchema,
          500: ErrorResponseSchema
        }
      }
    },
    async (_request, reply) => {
      try {
        const agents = await agentService.getAllAgents();
        
        return {
          ok: true,
          agents: agents.map((a) => ({
            id: a.id,
            name: a.name,
            role: a.role,
            description: a.description,
            capabilities: a.capabilities
          }))
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

  // GET /api/agents/:id/status - Get agent status
  fastify.get<{ Params: { id: string } }>(
    '/agents/:id/status',
    {
      schema: {
        tags: ['Agents'],
        description: 'Get agent status (health + gateway info)',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        },
        response: {
          200: AgentStatusResponseSchema,
          500: ErrorResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const status = await agentService.getAgentStatus(id);

        return {
          ok: true,
          ...status
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

  // POST /api/agents/:id/call - Call gateway RPC method
  fastify.post<{
    Params: { id: string };
    Body: { method: string; params?: any };
  }>(
    '/agents/:id/call',
    {
      schema: {
        tags: ['Agents'],
        description: 'Call OpenClaw gateway RPC method',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        },
        body: RpcCallBodySchema,
        response: {
          200: RpcCallResponseSchema,
          400: ErrorResponseSchema,
          500: ErrorResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { method, params } = request.body;

        if (!method) {
          return reply.status(400).send({
            ok: false,
            error: 'method is required'
          });
        }

        const result = await agentService.callGateway(id, method, params || {});

        return {
          ok: true,
          result
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
