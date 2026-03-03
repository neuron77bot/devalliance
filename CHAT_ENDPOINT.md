# Chat Endpoint - Comunicación Bidireccional con Agentes OpenClaw

## 📋 Resumen

Endpoint REST implementado para enviar mensajes a agentes OpenClaw (Luna, Sol, Mati) y capturar sus respuestas en tiempo real mediante eventos del Gateway Protocol v3.

## 🎯 Endpoint

```
POST /api/agents/:id/chat
```

### Request

```typescript
{
  message: string;          // Mensaje del usuario (requerido)
  sessionKey?: string;      // Opcional: reusar sesión existente
  deliver?: boolean;        // true = enviar respuesta a Telegram también
  thinking?: "low" | "medium" | "high";  // Nivel de razonamiento
  timeoutSeconds?: number;  // Default 300 (5 minutos)
}
```

### Response Exitosa

```json
{
  "ok": true,
  "reply": "Soy Sol, un agente de desarrollo",
  "sessionKey": "agent:main:api-1772545521351",
  "messageId": "msg-1772545521351-r7wdo0krv1b"
}
```

### Response con Error

```json
{
  "ok": false,
  "error": "The AI service is temporarily overloaded. Please try again in a moment."
}
```

### Códigos de Estado HTTP

- `200` - Respuesta exitosa (ok: true o ok: false con error del agente)
- `400` - Request inválido
- `404` - Agente no encontrado
- `500` - Error interno del servidor
- `503` - Agente no conectado

## 🛠️ Implementación

### Archivos Modificados

1. **`src/schemas/agent.schema.ts`**
   - `ChatRequestSchema` - Validación de request
   - `ChatResponseSchema` - Estructura de response
   - Tipos TypeScript exportados

2. **`src/services/OpenClawGatewayService.ts`**
   - `sendChatMessage()` - Envía mensaje y escucha eventos
   - Event handler para eventos `chat` del gateway
   - Manejo de estados: `error`, `complete`, `done`

3. **`src/services/AgentService.ts`**
   - `chatWithAgent()` - Método público para chat
   - Validación de agente y estado de conexión
   - Wrapper sobre OpenClawGatewayService

4. **`src/routes/agents.routes.ts`**
   - Ruta `POST /agents/:id/chat`
   - Validación con Typebox schemas
   - Manejo de errores HTTP apropiado

5. **`src/server.ts`**
   - Inyección de `openclawGatewayService` en agentRoutes
   - Registro de ruta con dependencias

## 🔧 Arquitectura

### Flujo de Comunicación

```
1. HTTP POST /api/agents/sol/chat
   ↓
2. AgentService.chatWithAgent()
   ↓
3. OpenClawGatewayService.sendChatMessage()
   ↓
4. Envía RPC: chat.send con params
   ↓
5. Escucha eventos: agent:event (chat)
   ↓
6. Captura estado: complete/error
   ↓
7. Retorna respuesta al HTTP client
```

### Protocolo Gateway v3

El endpoint usa el **Gateway Protocol v3** de OpenClaw:

- **Transport**: WebSocket con frames JSON
- **Handshake**: Challenge → Connect → Hello-OK
- **RPC**: chat.send con sessionKey e idempotencyKey
- **Events**: Escucha eventos `chat` con estado del mensaje

### Event Handling

Los eventos `chat` del gateway contienen:

```json
{
  "runId": "msg-1772545521351-r7wdo0krv1b",
  "sessionKey": "agent:main:api-1772545521351",
  "seq": 2,
  "state": "complete|error|pending|thinking",
  "content": "Respuesta del agente",
  "errorMessage": "Error si state === error"
}
```

**Estados posibles:**
- `pending` - Mensaje recibido, procesando
- `thinking` - Agente está razonando
- `complete` / `done` - Respuesta completada
- `error` - Error durante procesamiento

## 📝 Ejemplos de Uso

### Ejemplo Básico

```bash
curl -X POST http://localhost:3101/api/agents/sol/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hola Sol, ¿cuál es tu rol?"
  }'
```

### Con Timeout Personalizado

```bash
curl -X POST http://localhost:3101/api/agents/luna/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Resume el archivo README.md",
    "timeoutSeconds": 120
  }'
```

### Reutilizando Sesión

```bash
# Primera request
RESPONSE=$(curl -s -X POST http://localhost:3101/api/agents/sol/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hola, ¿cómo estás?"}')

SESSION_KEY=$(echo $RESPONSE | python3 -c "import json, sys; print(json.load(sys.stdin).get('sessionKey', ''))")

# Segunda request en la misma sesión
curl -X POST http://localhost:3101/api/agents/sol/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"¿Cuál fue mi pregunta anterior?\",
    \"sessionKey\": \"$SESSION_KEY\"
  }"
```

### Con Nivel de Razonamiento

```bash
curl -X POST http://localhost:3101/api/agents/mati/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Analiza la arquitectura del proyecto",
    "thinking": "high",
    "timeoutSeconds": 180
  }'
```

## 🧪 Testing

### Verificar Agentes Disponibles

```bash
curl -s http://localhost:3101/api/agents | python3 -m json.tool
```

### Verificar Estado de Conexión

```bash
curl -s http://localhost:3101/api/agents/sol/status | python3 -m json.tool
```

### Test de Chat Completo

```bash
#!/bin/bash

AGENT_ID="sol"
MESSAGE="Hola, ¿cuál es tu nombre?"

echo "Testing chat with agent: $AGENT_ID"
echo "Message: $MESSAGE"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3101/api/agents/$AGENT_ID/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"$MESSAGE\", \"timeoutSeconds\": 60}")

echo "Response:"
echo $RESPONSE | python3 -m json.tool

if echo $RESPONSE | grep -q '"ok": true'; then
  echo "✅ Chat successful!"
else
  echo "❌ Chat failed"
fi
```

## ⚠️ Limitaciones Conocidas

### 1. AI Service Overload

Si el servicio de IA (Anthropic Claude) está sobrecargado:

```json
{
  "ok": false,
  "error": "The AI service is temporarily overloaded. Please try again in a moment."
}
```

**Solución**: Reintentar después de unos segundos con backoff exponencial.

### 2. Timeout

Si el agente no responde dentro del timeout (default 300s):

```json
{
  "ok": false,
  "error": "Chat timeout after 300000ms"
}
```

**Solución**: Aumentar `timeoutSeconds` en el request.

### 3. Agente No Conectado

Si el agente no está conectado al gateway:

```json
{
  "ok": false,
  "error": "Agent 'sol' is not connected (status: disconnected)"
}
```

**Solución**: 
```bash
# Reconectar agente
curl -X POST http://localhost:3101/api/agents/sol/restart

# Verificar estado
curl http://localhost:3101/api/agents/sol/status
```

## 🔒 Seguridad

- **Sin autenticación externa**: El endpoint asume que el backend está protegido por firewall/VPN
- **Token interno**: Usa el gateway token del agente para autenticación con OpenClaw
- **Network mode: host**: Backend y agentes se comunican vía localhost
- **Sin rate limiting**: Implementar si se expone públicamente

## 🚀 Próximas Mejoras

- [ ] **Streaming responses**: WebSocket para respuestas en tiempo real
- [ ] **Rate limiting**: Por IP/usuario
- [ ] **Authentication**: JWT o API keys
- [ ] **History**: Persistir conversaciones en MongoDB
- [ ] **Multi-turn**: Context window management
- [ ] **Typing indicators**: Estado "pensando..."
- [ ] **File attachments**: Enviar archivos al agente
- [ ] **Voice input/output**: Integración con TTS/STT
- [ ] **Metrics**: Tracking de latencia y éxito/fallo
- [ ] **Retry logic**: Reintentos automáticos con backoff

## 📚 Referencias

- [Gateway Protocol v3 Docs](/usr/lib/node_modules/openclaw/docs/gateway/protocol.md)
- [OpenClaw RPC Reference](/usr/lib/node_modules/openclaw/docs/reference/rpc.md)
- [Mission Control API](/var/www/devalliance/documentation/AGENT_MANAGEMENT_API.md)
- [Skills Workflow](/var/www/devalliance/documentation/SKILLS_WORKFLOW.md)

---

**Versión:** 1.0.0  
**Fecha:** 3 Marzo 2026  
**Estado:** ✅ Operacional  
**Autor:** Subagente de Implementación
