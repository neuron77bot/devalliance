import { Type, Static } from '@sinclair/typebox';

export const GatewaySchema = Type.Object({
  url: Type.String(),
  token: Type.String(),
  healthUrl: Type.String()
});

export const AgentSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  role: Type.String(),
  description: Type.String(),
  gateway: GatewaySchema,
  capabilities: Type.Array(Type.String())
});

// Schema for creating a new agent
export const CreateAgentSchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  role: Type.String({ minLength: 1 }),
  description: Type.String({ minLength: 1 }),
  capabilities: Type.Optional(Type.Array(Type.String())),
  port: Type.Optional(Type.Number({ minimum: 1024, maximum: 65535 }))
});

// Schema for updating an existing agent
export const UpdateAgentSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1 })),
  role: Type.Optional(Type.String({ minLength: 1 })),
  description: Type.Optional(Type.String({ minLength: 1 })),
  capabilities: Type.Optional(Type.Array(Type.String()))
});

export const AgentListResponseSchema = Type.Object({
  ok: Type.Boolean(),
  agents: Type.Array(Type.Object({
    id: Type.String(),
    name: Type.String(),
    role: Type.String(),
    description: Type.String(),
    capabilities: Type.Array(Type.String()),
    status: Type.Optional(Type.String()),
    containerRunning: Type.Optional(Type.Boolean())
  }))
});

export const AgentStatusResponseSchema = Type.Object({
  ok: Type.Boolean(),
  agent: Type.Optional(AgentSchema),
  health: Type.Object({
    status: Type.String(),
    statusCode: Type.Optional(Type.Number())
  }),
  gatewayStatus: Type.Optional(Type.Any())
});

export const RpcCallBodySchema = Type.Object({
  method: Type.String(),
  params: Type.Optional(Type.Any())
});

export const RpcCallResponseSchema = Type.Object({
  ok: Type.Boolean(),
  result: Type.Optional(Type.Any()),
  error: Type.Optional(Type.String())
});

// Response schema for agent creation
export const CreateAgentResponseSchema = Type.Object({
  ok: Type.Boolean(),
  agent: Type.Optional(AgentSchema),
  error: Type.Optional(Type.String())
});

// Response schema for agent update
export const UpdateAgentResponseSchema = Type.Object({
  ok: Type.Boolean(),
  agent: Type.Optional(AgentSchema),
  error: Type.Optional(Type.String())
});

// Response schema for agent deletion
export const DeleteAgentResponseSchema = Type.Object({
  ok: Type.Boolean(),
  message: Type.Optional(Type.String()),
  error: Type.Optional(Type.String())
});

// Response schema for container operations (start/stop/restart)
export const ContainerOperationResponseSchema = Type.Object({
  ok: Type.Boolean(),
  message: Type.Optional(Type.String()),
  error: Type.Optional(Type.String())
});

export type Agent = Static<typeof AgentSchema>;
export type Gateway = Static<typeof GatewaySchema>;
export type RpcCallBody = Static<typeof RpcCallBodySchema>;
export type CreateAgent = Static<typeof CreateAgentSchema>;
export type UpdateAgent = Static<typeof UpdateAgentSchema>;
