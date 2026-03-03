# OpenClaw Gateway Protocol - Hallazgos

## 🎯 Problema Identificado

Nuestro cliente WebSocket actual no implementa correctamente el **Gateway Protocol** de OpenClaw.

### Errores Detectados

```
[OpenClaw Gateway Logs]
- "handshake timeout"
- "closed before connect"  
- "invalid handshake"
```

**Causa Root:** No estamos completando el handshake del protocolo Gateway.

---

## 📚 Protocolo Gateway WebSocket

Documentación oficial: `/usr/lib/node_modules/openclaw/docs/gateway/protocol.md`

### Transport
- WebSocket con frames JSON
- **Primera frame DEBE ser un `connect` request**
- Puerto: 18789 (default)

---

## 🔐 Flujo de Handshake Correcto

### 1️⃣ Gateway → Cliente: Challenge
```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": {
    "nonce": "uuid-random",
    "ts": 1737264000000
  }
}
```

### 2️⃣ Cliente → Gateway: Connect Request
```json
{
  "type": "req",
  "id": "unique-request-id",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "mission-control",
      "version": "2.0.0",
      "platform": "linux",
      "mode": "operator"
    },
    "role": "operator",
    "scopes": ["operator.read", "operator.write"],
    "caps": [],
    "commands": [],
    "permissions": {},
    "auth": {
      "token": "ed1b3f0d1d87cb0533e3d634f67d3c039ab464466aca9ff8"
    },
    "locale": "es-AR",
    "userAgent": "devalliance-mission-control/2.0.0"
  }
}
```

**Campos requeridos:**
- `minProtocol` / `maxProtocol`: 3 (versión actual)
- `role`: "operator" (control plane client)
- `scopes`: permisos solicitados
- `auth.token`: el gateway token del agente

**Campos opcionales:**
- `device`: identity + signature (requerido para conexiones remotas/no-loopback)
  - Si gateway tiene `allowInsecureAuth: true`, se puede omitir
  - Si está en loopback (127.0.0.1), auto-aprueba

### 3️⃣ Gateway → Cliente: Hello OK
```json
{
  "type": "res",
  "id": "same-request-id",
  "ok": true,
  "payload": {
    "type": "hello-ok",
    "protocol": 3,
    "policy": {
      "tickIntervalMs": 15000
    },
    "auth": {
      "deviceToken": "optional-device-token",
      "role": "operator",
      "scopes": ["operator.read", "operator.write"]
    }
  }
}
```

### 4️⃣ Ahora sí: RPC Calls
Después del handshake, se pueden enviar RPC requests normales:

```json
{
  "type": "req",
  "id": "req-2",
  "method": "sessions.list",
  "params": {}
}
```

---

## 🔧 Framing del Protocolo

### Request Frame
```json
{
  "type": "req",
  "id": "unique-id",
  "method": "method.name",
  "params": { }
}
```

### Response Frame
```json
{
  "type": "res",
  "id": "same-id-as-request",
  "ok": true,
  "payload": { }
}
```

### Event Frame
```json
{
  "type": "event",
  "event": "event.name",
  "payload": { },
  "seq": 123,
  "stateVersion": "v1"
}
```

---

## 👥 Roles y Scopes

### Roles
- **`operator`**: Control plane client (CLI/UI/automation) ✅ **Esto necesitamos**
- **`node`**: Capability host (camera/screen/canvas/system.run)

### Scopes (Operator)
- `operator.read` - Lectura de estado
- `operator.write` - Modificación (crear sessions, enviar mensajes)
- `operator.admin` - Admin operations
- `operator.approvals` - Aprobar/denegar exec requests
- `operator.pairing` - Device pairing

### Caps/Commands (Node)
Solo para `role: "node"`, no aplica a nosotros.

---

## 📡 Métodos RPC Disponibles

Una vez conectado con rol `operator`, se puede llamar:

**Status & Health:**
- `gateway.status`
- `gateway.health`
- `gateway.config.get`

**Sessions:**
- `sessions.list`
- `sessions.send`
- `sessions.spawn`
- `sessions.history`

**Agents:**
- `agent.info`
- `agent.config.get`

**Models:**
- `models.status`
- `models.auth.status`

**Channels:**
- `channels.status`
- `message.send`

**System:**
- `system.run`
- `exec.approval.resolve`

**Y muchos más...** (ver `src/gateway/protocol/schema.ts` en OpenClaw source)

---

## 🔐 Autenticación

### Token en Headers (❌ Incorrecto)
```javascript
new WebSocket(url, {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

**Esto NO funciona.** El protocolo Gateway no usa headers HTTP.

### Token en Connect Params (✅ Correcto)
```javascript
ws.send(JSON.stringify({
  type: "req",
  id: "1",
  method: "connect",
  params: {
    // ...
    auth: { token: "el-token-aqui" }
  }
}))
```

---

## 🚦 Estados de Conexión

1. **WebSocket Open** → Recibir challenge
2. **Send Connect** → Esperar hello-ok
3. **Connected** → Listo para RPC
4. **Authenticated** → Token validado

---

## 🔍 Device Identity (opcional)

Para conexiones **no-loopback** (remotas), se requiere device identity:

```json
{
  "device": {
    "id": "device_fingerprint",
    "publicKey": "...",
    "signature": "...",  // Firma del nonce del challenge
    "signedAt": 1737264000000,
    "nonce": "..."       // El nonce del challenge
  }
}
```

**Para desarrollo local (loopback):**
- Se puede omitir si gateway tiene `allowInsecureAuth: true`
- O usar `dangerouslyDisableDeviceAuth: true` (break-glass)

---

## 📝 Implementación Requerida

### Cambios en `OpenClawGatewayService.ts`

1. **Esperar challenge antes de connect:**
   ```typescript
   ws.on('message', (data) => {
     const msg = JSON.parse(data.toString());
     if (msg.type === 'event' && msg.event === 'connect.challenge') {
       this.sendConnectRequest(agentId, msg.payload.nonce);
     }
   });
   ```

2. **Enviar connect request con protocolo correcto:**
   ```typescript
   private sendConnectRequest(agentId: string, nonce: string) {
     const connectFrame = {
       type: "req",
       id: this.generateRequestId(),
       method: "connect",
       params: {
         minProtocol: 3,
         maxProtocol: 3,
         client: {
           id: "mission-control",
           version: "2.0.0",
           platform: "linux",
           mode: "operator"
         },
         role: "operator",
         scopes: ["operator.read", "operator.write"],
         auth: { token: connection.token },
         locale: "es-AR",
         userAgent: "devalliance-mission-control/2.0.0"
       }
     };
     ws.send(JSON.stringify(connectFrame));
   }
   ```

3. **Procesar hello-ok:**
   ```typescript
   if (msg.type === 'res' && msg.payload?.type === 'hello-ok') {
     connection.status = 'connected';
     connection.sessionId = msg.payload.sessionId;
     this.emit('agent:connected', { agentId });
   }
   ```

4. **Después de conectado, enviar RPC normalmente:**
   ```typescript
   async sendRPC(agentId: string, method: string, params?: any): Promise<any> {
     // Verificar que esté conectado primero
     if (connection.status !== 'connected') {
       throw new Error('Not connected');
     }
     
     const request = {
       type: "req",
       id: this.rpcIdCounter++,
       method,
       params
     };
     
     ws.send(JSON.stringify(request));
     // ... promise handling
   }
   ```

---

## 🎯 Próximos Pasos

### Opción A: Refactor OpenClawGatewayService
- Implementar handshake completo
- Seguir protocolo Gateway WebSocket
- Tiempo: ~30-45 min

### Opción B: Usar REST API
- Investigar si OpenClaw expone REST endpoints
- Más simple, evita WebSocket complexity
- Tiempo: ~15-20 min

### Opción C: Delegación
- Spawn sub-agente para implementar protocolo
- Testing completo
- Tiempo: ~45-60 min

---

## 📚 Referencias

**Documentación Local:**
- `/usr/lib/node_modules/openclaw/docs/gateway/protocol.md` - Protocolo completo
- `/usr/lib/node_modules/openclaw/docs/gateway/authentication.md` - Auth
- `/usr/lib/node_modules/openclaw/docs/gateway/remote.md` - Remote access
- `/usr/lib/node_modules/openclaw/docs/reference/rpc.md` - RPC patterns

**Online:**
- https://docs.openclaw.ai/gateway/protocol
- https://docs.openclaw.ai/gateway/authentication

**Source Code:**
- `openclaw/src/gateway/protocol/schema.ts` - TypeBox schemas
- `openclaw/src/gateway/server-ws.ts` - Gateway WebSocket server

---

**Generado:** 2 Mar 2026 16:52 GMT-3  
**Autor:** Neuron ⚡  
**Proyecto:** DevAlliance Mission Control
