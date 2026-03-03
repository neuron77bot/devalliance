# OpenClaw Integration - Quick Start Guide

## 🚀 Deployment Rápido

### 1. Verificar Prerrequisitos

```bash
# MongoDB corriendo
docker ps | grep mongo

# Containers OpenClaw existen
docker ps -a | grep openclaw-arquitecto
docker ps -a | grep openclaw-developer

# Red devalliance existe
docker network inspect devalliance
```

### 2. Preparar Containers OpenClaw

Si los containers no existen, crearlos:

```bash
# Desde DevAlliance Mission Control
# (Los containers se crean automáticamente via AgentService si tienes config/agents.json)

# O manualmente:
docker run -d \
  --name openclaw-arquitecto \
  --network devalliance \
  -p 18789:18789 \
  -e OPENCLAW_GATEWAY_TOKEN=ed1b3f0d1d87cb0533e3d634f67d3c039ab464466aca9ff8 \
  openclaw:local

docker run -d \
  --name openclaw-developer \
  --network devalliance \
  -p 18790:18789 \
  -e OPENCLAW_GATEWAY_TOKEN=f64422d81639a4765a3a6a0eb6bd898eb0eb852ca4770224 \
  openclaw:local
```

### 3. Verificar Configuración de Agentes en MongoDB

```bash
# Conectar a MongoDB
mongosh mongodb://localhost:27017/devalliance

# Verificar agentes
db.agents.find({ id: { $in: ["arquitecto", "developer"] } }).pretty()

# Deben tener:
# - id: "arquitecto" / "developer"
# - gateway.url: "ws://openclaw-arquitecto:18789" / "ws://openclaw-developer:18789"
# - gateway.token: (token correcto)
```

Si no existen, se crean automáticamente desde `config/agents.json` al iniciar backend.

### 4. Conectar Backend a Red Devalliance

```bash
# Verificar si backend está en la red
docker network inspect devalliance | grep devalliance-backend

# Si no está, conectar:
docker network connect devalliance devalliance-backend
```

### 5. Iniciar Backend

```bash
cd /var/www/devalliance/backend

# Development
npm run dev

# Production
npm run build
npm start
```

**Verificar logs:**
```
✅ OpenClaw services initialized successfully
✅ Agent arquitecto connected
✅ Agent developer connected
[StatusSync] Starting periodic sync
```

### 6. Iniciar Frontend

```bash
cd /var/www/devalliance/frontend
npm run dev
```

Abrir: http://localhost:5173

### 7. Verificación Rápida

#### Backend Health Check
```bash
curl http://localhost:3100/api/gateway/status | jq
```

Debe retornar:
```json
{
  "success": true,
  "connectedAgents": ["arquitecto", "developer"],
  "totalAgents": 2,
  "statuses": [
    {
      "agentId": "arquitecto",
      "status": "healthy",
      "containerRunning": true,
      "gatewayConnected": true
    },
    ...
  ]
}
```

#### Frontend Dashboard
1. Abrir Dashboard
2. Ver agentes con badge "Healthy" (verde pulsante)
3. Métricas visibles

#### Test de Ejecución
1. Ir a TaskBoard
2. Crear tarea:
   ```
   Title: Test OpenClaw Integration
   Description: List files in workspace directory (ls -la)
   Priority: Medium
   Assign to: arquitecto
   ```
3. Click en tarea → "Execute Task"
4. Ver output en tiempo real
5. Verificar status → "completed"

## 🔧 Troubleshooting

### Backend no conecta a gateways

**Error:**
```
[OpenClaw] ❌ Error on agent arquitecto: getaddrinfo EAI_AGAIN openclaw-arquitecto
```

**Solución:**
1. Verificar que container está running: `docker ps | grep openclaw-arquitecto`
2. Si stopped: `docker start openclaw-arquitecto`
3. Verificar red: `docker network inspect devalliance`
4. Forzar reconexión: `POST /api/agents/arquitecto/reconnect`

### Container running pero gateway no conecta

**Error:**
```
[OpenClaw] Connection closed for agent arquitecto
```

**Solución:**
1. Verificar token en MongoDB coincide con container
2. Verificar que gateway OpenClaw está escuchando en puerto 18789
3. Ver logs del container: `docker logs openclaw-arquitecto`
4. Reiniciar container: `docker restart openclaw-arquitecto`

### Frontend no recibe updates

**Problema:**
Frontend no muestra outputs en tiempo real

**Solución:**
1. Abrir DevTools → Network → WS
2. Verificar conexión WebSocket activa
3. Verificar que backend está emitiendo eventos (ver logs)
4. Reload frontend

### Task execution timeout

**Error:**
```
RPC timeout for method sessions.send on agent arquitecto
```

**Solución:**
1. Verificar que agente está realmente ejecutando (logs container)
2. Para tareas largas: incrementar timeout en código
3. Considerar usar progress updates

## 📊 Testing Completo

Seguir: `TESTING_CHECKLIST.md`

Tests críticos rápidos:

```bash
# 1. Health check
curl http://localhost:3100/api/gateway/status

# 2. Crear tarea
TASK_ID=$(curl -X POST http://localhost:3100/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"ls -la","priority":"medium","assignedTo":"arquitecto"}' \
  | jq -r '._id')

# 3. Ejecutar tarea
curl -X POST http://localhost:3100/api/tasks/$TASK_ID/execute

# 4. Ver output (esperar unos segundos)
curl http://localhost:3100/api/tasks/$TASK_ID/output | jq

# 5. Ver status final
curl http://localhost:3100/api/tasks/$TASK_ID | jq '.status'
# Debe ser: "completed"
```

## 📝 Endpoints Útiles

```bash
# Gateway
GET    /api/gateway/status
POST   /api/gateway/rpc

# Agents
POST   /api/agents/:id/connect
POST   /api/agents/:id/disconnect
GET    /api/agents/:id/output
GET    /api/agents/:id/gateway-status
POST   /api/agents/:id/reconnect

# Tasks
POST   /api/tasks/:id/execute
POST   /api/tasks/:id/cancel
GET    /api/tasks/:id/output

# Docs
GET    /docs (Swagger UI)
```

## 🎯 Métricas de Éxito

Backend running correctamente si:
- ✅ `[OpenClaw] ✅ Services initialized successfully`
- ✅ `[OpenClaw] ✅ Agent {agentId} connected` para ambos agentes
- ✅ `[StatusSync] Starting periodic sync`
- ✅ `[StatusSync] Sync complete: 2 successful, 0 failed`

Frontend funcionando correctamente si:
- ✅ Dashboard muestra agentes con status "Healthy"
- ✅ WebSocket conectado (DevTools → Network → WS)
- ✅ Métricas visibles (CPU, RAM, Uptime)
- ✅ TaskBoard permite crear tareas
- ✅ Ejecución de tareas muestra output en tiempo real

## 🔗 Documentación Completa

- **Guía técnica:** `OPENCLAW_INTEGRATION.md`
- **Testing:** `TESTING_CHECKLIST.md`
- **Resumen:** `IMPLEMENTATION_SUMMARY.md`

## 🆘 Soporte

Si encuentras problemas no cubiertos aquí:

1. Ver logs detallados del backend
2. Ver logs de containers OpenClaw: `docker logs openclaw-arquitecto`
3. Verificar MongoDB: `mongosh` → `db.agents.find()`
4. Revisar TROUBLESHOOTING en `OPENCLAW_INTEGRATION.md`

---

**Happy coding! 🚀**
