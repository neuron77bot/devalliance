import { Type, Static } from '@sinclair/typebox';

export const TaskStatusEnum = Type.Union([
  Type.Literal('pending'),
  Type.Literal('assigned'),
  Type.Literal('in_progress'),
  Type.Literal('paused'),
  Type.Literal('completed'),
  Type.Literal('failed'),
  Type.Literal('cancelled')
]);

export const TaskPriorityEnum = Type.Union([
  Type.Literal('low'),
  Type.Literal('medium'),
  Type.Literal('high'),
  Type.Literal('urgent')
]);

export const TaskMetadataSchema = Type.Object({
  notes: Type.Optional(Type.String()),
  attachments: Type.Optional(Type.Array(Type.String()))
});

export const CreateTaskSchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 200 }),
  description: Type.String({ minLength: 1, maxLength: 2000 }),
  priority: Type.Optional(TaskPriorityEnum),
  assignedTo: Type.Optional(Type.String()),
  createdBy: Type.Optional(Type.String()),
  estimatedDuration: Type.Optional(Type.Number({ minimum: 0 })),
  tags: Type.Optional(Type.Array(Type.String())),
  dependencies: Type.Optional(Type.Array(Type.String())),
  metadata: Type.Optional(TaskMetadataSchema),
  autoAssign: Type.Optional(Type.Boolean())
});

export const UpdateTaskSchema = Type.Partial(
  Type.Object({
    title: Type.String({ minLength: 1, maxLength: 200 }),
    description: Type.String({ minLength: 1, maxLength: 2000 }),
    status: TaskStatusEnum,
    priority: TaskPriorityEnum,
    assignedTo: Type.String(),
    estimatedDuration: Type.Number({ minimum: 0 }),
    tags: Type.Array(Type.String()),
    dependencies: Type.Array(Type.String()),
    metadata: TaskMetadataSchema
  })
);

export const TaskFilterSchema = Type.Object({
  status: Type.Optional(TaskStatusEnum),
  priority: Type.Optional(TaskPriorityEnum),
  assignedTo: Type.Optional(Type.String()),
  tags: Type.Optional(Type.Array(Type.String())),
  search: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 200 })),
  skip: Type.Optional(Type.Number({ minimum: 0 }))
});

export const HandoffRequestSchema = Type.Object({
  toAgent: Type.String(),
  message: Type.Optional(Type.String())
});

export const CommentSchema = Type.Object({
  message: Type.String({ minLength: 1, maxLength: 1000 }),
  fromAgent: Type.Optional(Type.String())
});

export const StatusChangeSchema = Type.Object({
  status: TaskStatusEnum,
  reason: Type.Optional(Type.String())
});

export const AssignTaskSchema = Type.Object({
  agentId: Type.String()
});

export type CreateTaskInput = Static<typeof CreateTaskSchema>;
export type UpdateTaskInput = Static<typeof UpdateTaskSchema>;
export type TaskFilterInput = Static<typeof TaskFilterSchema>;
export type HandoffRequestInput = Static<typeof HandoffRequestSchema>;
export type CommentInput = Static<typeof CommentSchema>;
export type StatusChangeInput = Static<typeof StatusChangeSchema>;
export type AssignTaskInput = Static<typeof AssignTaskSchema>;
