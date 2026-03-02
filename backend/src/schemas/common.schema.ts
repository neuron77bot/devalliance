import { Type } from '@sinclair/typebox';

export const HealthResponseSchema = Type.Object({
  ok: Type.Boolean(),
  service: Type.String(),
  timestamp: Type.Optional(Type.String())
});

export const ConfigResponseSchema = Type.Object({
  baseUrl: Type.String(),
  basePath: Type.String(),
  environment: Type.String()
});

export const StatusResponseSchema = Type.Object({
  ok: Type.Boolean(),
  agents: Type.Array(Type.Object({
    id: Type.String(),
    name: Type.String(),
    role: Type.String(),
    health: Type.String(),
    url: Type.String()
  })),
  timestamp: Type.String()
});

export const ErrorResponseSchema = Type.Object({
  ok: Type.Boolean(),
  error: Type.String()
});
