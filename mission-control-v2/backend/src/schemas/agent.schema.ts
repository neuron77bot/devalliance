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

export const AgentListResponseSchema = Type.Object({
  ok: Type.Boolean(),
  agents: Type.Array(Type.Object({
    id: Type.String(),
    name: Type.String(),
    role: Type.String(),
    description: Type.String(),
    capabilities: Type.Array(Type.String())
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

export type Agent = Static<typeof AgentSchema>;
export type Gateway = Static<typeof GatewaySchema>;
export type RpcCallBody = Static<typeof RpcCallBodySchema>;
