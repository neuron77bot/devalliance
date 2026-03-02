import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { OpenClawGatewayService } from '../services/OpenClawGatewayService';
import { TaskService } from '../services/TaskService';
import { StatusSyncService } from '../services/StatusSyncService';

export default async function gatewayRoutes(
  fastify: FastifyInstance,
  gatewayService: OpenClawGatewayService,
  taskService: TaskService,
  statusSyncService: StatusSyncService
) {
  /**
   * Connect to agent's OpenClaw gateway
   */
  fastify.post('/agents/:id/connect', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      await gatewayService.connectAgent(id);
      
      reply.send({
        success: true,
        message: `Connected to agent ${id}`,
        status: gatewayService.getConnectionStatus(id)
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Disconnect from agent's gateway
   */
  fastify.post('/agents/:id/disconnect', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      await gatewayService.disconnectAgent(id);
      
      reply.send({
        success: true,
        message: `Disconnected from agent ${id}`
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get agent output logs
   */
  fastify.get('/agents/:id/output', async (
    request: FastifyRequest<{
      Params: { id: string };
      Querystring: { limit?: number };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const { limit = 100 } = request.query;
      
      const output = await taskService.getAgentOutput(id, limit);
      
      reply.send({
        success: true,
        agentId: id,
        count: output.length,
        output
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Execute task on OpenClaw
   */
  fastify.post('/tasks/:id/execute', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const result = await taskService.executeTask(id);
      
      reply.send({
        success: true,
        taskId: id,
        message: 'Task execution started',
        result
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Cancel task execution
   */
  fastify.post('/tasks/:id/cancel', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const result = await taskService.cancelTask(id);
      
      reply.send({
        success: true,
        taskId: id,
        message: 'Task execution cancelled',
        task: result
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get task output logs
   */
  fastify.get('/tasks/:id/output', async (
    request: FastifyRequest<{
      Params: { id: string };
      Querystring: { limit?: number };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const { limit = 100 } = request.query;
      
      const output = await taskService.getTaskOutput(id, limit);
      
      reply.send({
        success: true,
        taskId: id,
        count: output.length,
        output
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Send RPC command to agent (testing/debugging)
   */
  fastify.post('/gateway/rpc', async (
    request: FastifyRequest<{
      Body: {
        agentId: string;
        method: string;
        params?: any;
      };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { agentId, method, params } = request.body;
      
      const result = await gatewayService.sendRPC(agentId, method, params);
      
      reply.send({
        success: true,
        agentId,
        method,
        result
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get gateway connection status
   */
  fastify.get('/gateway/status', async (
    _request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      const connectedAgents = gatewayService.getConnectedAgents();
      const statuses = await statusSyncService.getAllStatuses();
      
      reply.send({
        success: true,
        connectedAgents,
        totalAgents: statuses.length,
        statuses
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get agent status
   */
  fastify.get('/agents/:id/status', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const status = await statusSyncService.getCurrentStatus(id);
      
      reply.send({
        success: true,
        status
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Force reconnect agent
   */
  fastify.post('/agents/:id/reconnect', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      await statusSyncService.forceReconnect(id);
      
      reply.send({
        success: true,
        message: `Agent ${id} reconnected`,
        status: gatewayService.getConnectionStatus(id)
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });
}
