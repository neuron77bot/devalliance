import { FastifyInstance } from 'fastify';
import { TaskService } from '../services/TaskService';
import { Type } from '@sinclair/typebox';

export default async function taskRoutes(fastify: FastifyInstance) {
  const taskService = new TaskService();

  // GET /api/tasks - List all tasks
  fastify.get(
    '/tasks',
    {
      schema: {
        tags: ['Tasks'],
        description: 'Get all tasks',
        response: {
          200: Type.Object({
            ok: Type.Boolean(),
            tasks: Type.Array(Type.Any())
          })
        }
      }
    },
    async () => {
      const tasks = await taskService.getAllTasks();
      return { ok: true, tasks };
    }
  );

  // POST /api/tasks - Create task
  fastify.post(
    '/tasks',
    {
      schema: {
        tags: ['Tasks'],
        description: 'Create a new task',
        body: Type.Object({
          title: Type.String(),
          description: Type.String(),
          assignedTo: Type.Optional(Type.String()),
          priority: Type.Optional(Type.String())
        }),
        response: {
          201: Type.Object({
            ok: Type.Boolean(),
            task: Type.Any()
          })
        }
      }
    },
    async (request, reply) => {
      const task = await taskService.createTask(request.body as any);
      return reply.status(201).send({ ok: true, task });
    }
  );

  // GET /api/tasks/:id - Get task by ID
  fastify.get<{ Params: { id: string } }>(
    '/tasks/:id',
    {
      schema: {
        tags: ['Tasks'],
        description: 'Get task by ID',
        params: Type.Object({
          id: Type.String()
        })
      }
    },
    async (request, reply) => {
      const task = await taskService.getTaskById(request.params.id);
      if (!task) {
        return reply.status(404).send({ ok: false, error: 'Task not found' });
      }
      return { ok: true, task };
    }
  );

  // PATCH /api/tasks/:id - Update task
  fastify.patch<{ Params: { id: string }; Body: any }>(
    '/tasks/:id',
    {
      schema: {
        tags: ['Tasks'],
        description: 'Update task',
        params: Type.Object({
          id: Type.String()
        })
      }
    },
    async (request, reply) => {
      const task = await taskService.updateTask(request.params.id, request.body as any);
      if (!task) {
        return reply.status(404).send({ ok: false, error: 'Task not found' });
      }
      return { ok: true, task };
    }
  );

  // DELETE /api/tasks/:id - Delete task
  fastify.delete<{ Params: { id: string } }>(
    '/tasks/:id',
    {
      schema: {
        tags: ['Tasks'],
        description: 'Delete task',
        params: Type.Object({
          id: Type.String()
        })
      }
    },
    async (request, reply) => {
      const deleted = await taskService.deleteTask(request.params.id);
      if (!deleted) {
        return reply.status(404).send({ ok: false, error: 'Task not found' });
      }
      return { ok: true, message: 'Task deleted' };
    }
  );
}
