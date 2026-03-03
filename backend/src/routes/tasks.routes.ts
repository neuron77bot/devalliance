import { FastifyInstance } from 'fastify';
import { TaskService } from '../services/TaskService';
import { InteractionService } from '../services/InteractionService';
import { QueueService } from '../services/QueueService';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  TaskFilterSchema,
  HandoffRequestSchema,
  CommentSchema,
  StatusChangeSchema,
  AssignTaskSchema,
  TaskCallbackSchema,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilterInput,
  HandoffRequestInput,
  CommentInput,
  StatusChangeInput,
  AssignTaskInput,
  TaskCallbackInput
} from '../schemas/task.schema';

export default async function taskRoutes(fastify: FastifyInstance) {
  const taskService = new TaskService();
  const interactionService = new InteractionService();
  const queueService = new QueueService();

  // Create task
  fastify.post<{ Body: CreateTaskInput }>(
    '/tasks',
    {
      schema: {
        body: CreateTaskSchema
      }
    },
    async (request, reply) => {
      try {
        const task = await taskService.createTask(request.body);
        
        // Broadcast WebSocket event
        fastify.websocketBroadcast.clients.forEach((client: any) => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'task_created',
              task,
              timestamp: new Date().toISOString()
            }));
          }
        });

        reply.code(201);
        return task;
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get all tasks (with filters)
  fastify.get<{ Querystring: TaskFilterInput }>(
    '/tasks',
    {
      schema: {
        querystring: TaskFilterSchema
      }
    },
    async (request, reply) => {
      try {
        const tasks = await taskService.getAllTasks(request.query);
        return reply.send(tasks);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get task statistics (DEBE IR ANTES DE /tasks/:id)
  fastify.get('/tasks/stats/global', async (_request, reply) => {
    try {
      const stats = await taskService.getTaskStats();
      return reply.send(stats);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Get queue statistics (DEBE IR ANTES DE /tasks/:id)
  fastify.get('/tasks/queue/stats/global', async (_request, reply) => {
    try {
      const stats = await queueService.getQueueStats();
      return reply.send(stats);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Get agent queue (DEBE IR ANTES DE /tasks/:id)
  fastify.get<{ Params: { agentId: string } }>(
    '/tasks/queue/:agentId',
    async (request, reply) => {
      try {
        const queue = await queueService.getAgentQueue(request.params.agentId);
        return reply.send(queue);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  // Get task by ID (DEBE IR DESPUÉS DE RUTAS ESPECÍFICAS)
  fastify.get<{ Params: { id: string } }>(
    '/tasks/:id',
    async (request, reply) => {
      try {
        const task = await taskService.getTaskById(request.params.id);
        if (!task) {
          return reply.code(404).send({ error: 'Task not found' });
        }
        return reply.send(task);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  // Update task
  fastify.put<{ Params: { id: string }; Body: UpdateTaskInput }>(
    '/tasks/:id',
    {
      schema: {
        body: UpdateTaskSchema
      }
    },
    async (request, reply) => {
      try {
        const task = await taskService.updateTask(request.params.id, request.body);
        if (!task) {
          return reply.code(404).send({ error: 'Task not found' });
        }

        // Broadcast WebSocket event
        fastify.websocketBroadcast.clients.forEach((client: any) => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'task_updated',
              task,
              timestamp: new Date().toISOString()
            }));
          }
        });

        return reply.send(task);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  // Delete task
  fastify.delete<{ Params: { id: string } }>(
    '/tasks/:id',
    async (request, reply) => {
      try {
        const deleted = await taskService.deleteTask(request.params.id);
        if (!deleted) {
          return reply.code(404).send({ error: 'Task not found' });
        }

        // Broadcast WebSocket event
        fastify.websocketBroadcast.clients.forEach((client: any) => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'task_deleted',
              taskId: request.params.id,
              timestamp: new Date().toISOString()
            }));
          }
        });

        return reply.send({ success: true });
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  // Change task status
  fastify.put<{ Params: { id: string }; Body: StatusChangeInput }>(
    '/tasks/:id/status',
    {
      schema: {
        body: StatusChangeSchema
      }
    },
    async (request, reply) => {
      try {
        const { status, reason } = request.body;
        const task = await taskService.changeStatus(request.params.id, status, undefined, reason);
        
        if (!task) {
          return reply.code(404).send({ error: 'Task not found' });
        }

        // Broadcast WebSocket event
        fastify.websocketBroadcast.clients.forEach((client: any) => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'task_updated',
              task,
              timestamp: new Date().toISOString()
            }));
          }
        });

        return reply.send(task);
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // Assign task to agent
  fastify.put<{ Params: { id: string }; Body: AssignTaskInput }>(
    '/tasks/:id/assign',
    {
      schema: {
        body: AssignTaskSchema
      }
    },
    async (request, reply) => {
      try {
        const task = await taskService.assignTask(request.params.id, request.body.agentId);
        if (!task) {
          return reply.code(404).send({ error: 'Task not found' });
        }

        // Broadcast WebSocket event
        fastify.websocketBroadcast.clients.forEach((client: any) => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'task_updated',
              task,
              timestamp: new Date().toISOString()
            }));
          }
        });

        return reply.send(task);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  // Handoff task to another agent
  fastify.post<{ Params: { id: string }; Body: HandoffRequestInput }>(
    '/tasks/:id/handoff',
    {
      schema: {
        body: HandoffRequestSchema
      }
    },
    async (request, reply) => {
      try {
        const task = await taskService.getTaskById(request.params.id);
        if (!task) {
          return reply.code(404).send({ error: 'Task not found' });
        }

        const fromAgent = task.assignedTo || 'system';
        const result = await taskService.handoffTask(
          request.params.id,
          fromAgent,
          request.body.toAgent,
          request.body.message
        );

        // Broadcast WebSocket event
        fastify.websocketBroadcast.clients.forEach((client: any) => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'task_handoff',
              task: result.task,
              interaction: result.interaction,
              timestamp: new Date().toISOString()
            }));
          }
        });

        return reply.send(result);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  // Accept handoff
  fastify.post<{ Params: { id: string }; Body: { agentId: string } }>(
    '/tasks/:id/accept-handoff',
    async (request, reply) => {
      try {
        const task = await taskService.acceptHandoff(request.params.id, request.body.agentId);
        if (!task) {
          return reply.code(404).send({ error: 'Task not found' });
        }

        // Broadcast WebSocket event
        fastify.websocketBroadcast.clients.forEach((client: any) => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'task_updated',
              task,
              timestamp: new Date().toISOString()
            }));
          }
        });

        return reply.send(task);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  // Add comment
  fastify.post<{ Params: { id: string }; Body: CommentInput }>(
    '/tasks/:id/comment',
    {
      schema: {
        body: CommentSchema
      }
    },
    async (request, reply) => {
      try {
        const { message, fromAgent } = request.body;
        const interaction = await taskService.addComment(
          request.params.id,
          fromAgent || 'system',
          message
        );
        return reply.code(201).send(interaction);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  // Task callback from agent (skill notification)
  fastify.post<{ Params: { id: string }; Body: TaskCallbackInput }>(
    '/tasks/:id/callback',
    {
      schema: {
        body: TaskCallbackSchema
      }
    },
    async (request, reply) => {
      try {
        // Validate agent token
        const agentToken = request.headers['x-agent-token'] as string;
        if (!agentToken) {
          return reply.code(401).send({ error: 'Missing agent token' });
        }

        const { status, result, error } = request.body;
        
        // Handle callback
        const task = await taskService.handleCallback(
          request.params.id,
          agentToken,
          status,
          result,
          error
        );

        if (!task) {
          return reply.code(404).send({ error: 'Task not found' });
        }

        // Broadcast WebSocket event
        fastify.websocketBroadcast.clients.forEach((client: any) => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'task_callback',
              task,
              callback: { status, result, error },
              timestamp: new Date().toISOString()
            }));
          }
        });

        return reply.send({ 
          success: true, 
          taskId: request.params.id,
          newStatus: task.status 
        });
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // Get task interactions
  fastify.get<{ Params: { id: string } }>(
    '/tasks/:id/interactions',
    async (request, reply) => {
      try {
        const interactions = await interactionService.getTaskInteractions(request.params.id);
        return reply.send(interactions);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );
}
