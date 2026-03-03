import { FastifyInstance } from 'fastify';
import { AgentService } from '../services/AgentService';
import {
  AgentListResponseSchema,
  AgentStatusResponseSchema,
  RpcCallBodySchema,
  RpcCallResponseSchema,
  CreateAgentSchema,
  UpdateAgentSchema,
  CreateAgentResponseSchema,
  UpdateAgentResponseSchema,
  DeleteAgentResponseSchema,
  ContainerOperationResponseSchema,
  ChatRequestSchema,
  ChatResponseSchema,
  TUITokenResponseSchema
} from '../schemas/agent.schema';
import { ErrorResponseSchema } from '../schemas/common.schema';
import { OpenClawGatewayService } from '../services/OpenClawGatewayService';

export default async function agentRoutes(
  fastify: FastifyInstance,
  options?: { openclawGatewayService?: OpenClawGatewayService }
) {
  const agentService = new AgentService(options?.openclawGatewayService);

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
        const agents = await agentService.getAllAgentsWithStatus();
        
        return {
          ok: true,
          agents
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

  // POST /api/agents - Create new agent
  fastify.post<{ Body: { name: string; role: string; description: string; capabilities?: string[]; port?: number } }>(
    '/agents',
    {
      schema: {
        tags: ['Agents'],
        description: 'Create a new agent with Docker container',
        body: CreateAgentSchema,
        response: {
          201: CreateAgentResponseSchema,
          400: ErrorResponseSchema,
          500: ErrorResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const agent = await agentService.createAgent(request.body);
        
        return reply.status(201).send({
          ok: true,
          agent
        });
      } catch (error) {
        fastify.log.error(error);
        const statusCode = (error as Error).message.includes('already exists') ? 400 : 500;
        return reply.status(statusCode).send({
          ok: false,
          error: (error as Error).message
        });
      }
    }
  );

  // PUT /api/agents/:id - Update existing agent
  fastify.put<{ Params: { id: string }; Body: { name?: string; role?: string; description?: string; capabilities?: string[] } }>(
    '/agents/:id',
    {
      schema: {
        tags: ['Agents'],
        description: 'Update an existing agent',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        },
        body: UpdateAgentSchema,
        response: {
          200: UpdateAgentResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const agent = await agentService.updateAgent(id, request.body);
        
        return {
          ok: true,
          agent
        };
      } catch (error) {
        fastify.log.error(error);
        const statusCode = (error as Error).message.includes('not found') ? 404 : 500;
        return reply.status(statusCode).send({
          ok: false,
          error: (error as Error).message
        });
      }
    }
  );

  // DELETE /api/agents/:id - Delete agent
  fastify.delete<{ Params: { id: string } }>(
    '/agents/:id',
    {
      schema: {
        tags: ['Agents'],
        description: 'Delete an agent and its Docker container',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        },
        response: {
          200: DeleteAgentResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        await agentService.deleteAgent(id);
        
        return {
          ok: true,
          message: `Agent ${id} deleted successfully`
        };
      } catch (error) {
        fastify.log.error(error);
        const statusCode = (error as Error).message.includes('not found') ? 404 : 500;
        return reply.status(statusCode).send({
          ok: false,
          error: (error as Error).message
        });
      }
    }
  );

  // POST /api/agents/:id/start - Start agent container
  fastify.post<{ Params: { id: string } }>(
    '/agents/:id/start',
    {
      schema: {
        tags: ['Agents'],
        description: 'Start agent Docker container',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        },
        response: {
          200: ContainerOperationResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        await agentService.startAgent(id);
        
        return {
          ok: true,
          message: `Agent ${id} started successfully`
        };
      } catch (error) {
        fastify.log.error(error);
        const statusCode = (error as Error).message.includes('not found') ? 404 : 500;
        return reply.status(statusCode).send({
          ok: false,
          error: (error as Error).message
        });
      }
    }
  );

  // POST /api/agents/:id/stop - Stop agent container
  fastify.post<{ Params: { id: string } }>(
    '/agents/:id/stop',
    {
      schema: {
        tags: ['Agents'],
        description: 'Stop agent Docker container',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        },
        response: {
          200: ContainerOperationResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        await agentService.stopAgent(id);
        
        return {
          ok: true,
          message: `Agent ${id} stopped successfully`
        };
      } catch (error) {
        fastify.log.error(error);
        const statusCode = (error as Error).message.includes('not found') ? 404 : 500;
        return reply.status(statusCode).send({
          ok: false,
          error: (error as Error).message
        });
      }
    }
  );

  // POST /api/agents/:id/restart - Restart agent container
  fastify.post<{ Params: { id: string } }>(
    '/agents/:id/restart',
    {
      schema: {
        tags: ['Agents'],
        description: 'Restart agent Docker container',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        },
        response: {
          200: ContainerOperationResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        await agentService.restartAgent(id);
        
        return {
          ok: true,
          message: `Agent ${id} restarted successfully`
        };
      } catch (error) {
        fastify.log.error(error);
        const statusCode = (error as Error).message.includes('not found') ? 404 : 500;
        return reply.status(statusCode).send({
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

  // POST /api/agents/:id/chat - Send chat message and get response
  fastify.post<{
    Params: { id: string };
    Body: {
      message: string;
      sessionKey?: string;
      deliver?: boolean;
      thinking?: 'low' | 'medium' | 'high';
      timeoutSeconds?: number;
    };
  }>(
    '/agents/:id/chat',
    {
      schema: {
        tags: ['Agents'],
        description: 'Send chat message to agent and receive response',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Agent ID (e.g., "luna", "sol", "mati")' }
          },
          required: ['id']
        },
        body: ChatRequestSchema,
        response: {
          200: ChatResponseSchema,
          400: ErrorResponseSchema,
          500: ErrorResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const chatRequest = request.body;

        fastify.log.info(`[Chat] Request for agent ${id}: ${chatRequest.message.slice(0, 100)}`);

        const response = await agentService.chatWithAgent(id, chatRequest);

        if (!response.ok) {
          const statusCode = response.error?.includes('not found') ? 404 : 
                           response.error?.includes('not connected') ? 503 : 400;
          return reply.status(statusCode).send(response);
        }

        return response;

      } catch (error) {
        fastify.log.error(error, '[Chat] Error');
        return reply.status(500).send({
          ok: false,
          error: (error as Error).message
        });
      }
    }
  );

  // GET /api/agents/:id/tui-token - Generate TUI token for WebSocket access
  fastify.get<{ Params: { id: string } }>(
    '/agents/:id/tui-token',
    {
      schema: {
        tags: ['Agents'],
        description: 'Generate temporary token for TUI WebSocket access',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Agent ID (e.g., "luna", "sol", "mati")' }
          },
          required: ['id']
        },
        response: {
          200: TUITokenResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        fastify.log.info(`[TUI] Token request for agent ${id}`);

        const response = await agentService.generateTUIToken(id);

        if (!response.ok) {
          const statusCode = response.error?.includes('not found') ? 404 : 500;
          return reply.status(statusCode).send(response);
        }

        return response;

      } catch (error) {
        fastify.log.error(error, '[TUI] Error');
        return reply.status(500).send({
          ok: false,
          error: (error as Error).message
        });
      }
    }
  );
}
