# OpenClaw Integration - Testing Checklist

## Pre-Testing Setup

- [ ] Backend running: `cd /var/www/devalliance/backend && npm run dev`
- [ ] Frontend running: `cd /var/www/devalliance/frontend && npm run dev`
- [ ] MongoDB running: `docker ps | grep mongo`
- [ ] OpenClaw containers running:
  - [ ] `docker ps | grep openclaw-arquitecto`
  - [ ] `docker ps | grep openclaw-developer`
- [ ] Containers en red devalliance: `docker network inspect devalliance`

## 1. Backend Initialization Tests

### 1.1 Gateway Service Initialization
- [ ] Backend logs muestran: `[OpenClaw] Initializing services...`
- [ ] Backend logs muestran: `[OpenClaw] Found 2 agents with gateway configuration`
- [ ] Backend logs muestran: `[OpenClaw] ✅ Agent arquitecto connected`
- [ ] Backend logs muestran: `[OpenClaw] ✅ Agent developer connected`
- [ ] Backend logs muestran: `[OpenClaw] ✅ Services initialized successfully`

### 1.2 Status Sync Initialization
- [ ] Backend logs muestran: `[StatusSync] Starting periodic sync`
- [ ] Cada 30s backend logs muestran: `[StatusSync] Syncing 2 agents...`
- [ ] Sync completo exitoso: `[StatusSync] Sync complete: 2 successful, 0 failed`

### 1.3 WebSocket Plugin
- [ ] Backend logs muestran: `✅ WebSocket support enabled at /ws`
- [ ] Endpoint `/ws` disponible

## 2. API Endpoint Tests

### 2.1 Gateway Status
```bash
curl http://localhost:3100/api/gateway/status
```
- [ ] Response status: 200
- [ ] `connectedAgents` array contiene: `["arquitecto", "developer"]`
- [ ] `statuses` array tiene 2 elementos
- [ ] Cada status tiene:
  - [ ] `agentId`
  - [ ] `status: "healthy"`
  - [ ] `containerRunning: true`
  - [ ] `gatewayConnected: true`
  - [ ] `metrics` object con cpu, memory, uptime

### 2.2 Agent Status
```bash
curl http://localhost:3100/api/agents/arquitecto/status
```
- [ ] Response status: 200
- [ ] `status.status: "healthy"`
- [ ] `status.containerRunning: true`
- [ ] `status.gatewayConnected: true`
- [ ] `status.metrics` presente
- [ ] `status.responseTime` > 0

### 2.3 Agent Output (Empty)
```bash
curl http://localhost:3100/api/agents/arquitecto/output
```
- [ ] Response status: 200
- [ ] `count: 0`
- [ ] `output: []`

## 3. Task Execution Tests

### 3.1 Create Simple Task
```bash
curl -X POST http://localhost:3100/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "List files test",
    "description": "Run ls -la in current directory and report output",
    "priority": "medium",
    "assignedTo": "arquitecto"
  }'
```
- [ ] Response status: 201
- [ ] Task created con `_id`
- [ ] `status: "assigned"`
- [ ] `assignedTo: "arquitecto"`
- [ ] Save taskId: `TASK_ID=...`

### 3.2 Execute Task
```bash
curl -X POST http://localhost:3100/api/tasks/{TASK_ID}/execute
```
- [ ] Response status: 200
- [ ] `success: true`
- [ ] Backend logs muestran: `[TaskService] ✅ Task {TASK_ID} completed successfully`
- [ ] O si falla: `[OpenClaw] RPC error` con detalles

### 3.3 Check Task Output
```bash
curl http://localhost:3100/api/tasks/{TASK_ID}/output
```
- [ ] Response status: 200
- [ ] `count` > 0
- [ ] `output` array con elementos:
  - [ ] `type: "output"` con mensaje "🚀 Starting task execution..."
  - [ ] `type: "result"` con resultado de ejecución
  - [ ] Timestamps correctos

### 3.4 Verify Task Status
```bash
curl http://localhost:3100/api/tasks/{TASK_ID}
```
- [ ] `status: "completed"` (si exitoso)
- [ ] O `status: "failed"` (si error)
- [ ] `startedAt` presente
- [ ] `completedAt` presente
- [ ] `actualDuration` calculado

### 3.5 Cancel Task (New Task)
```bash
# Create new task
TASK_ID2=$(curl -X POST http://localhost:3100/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test cancel","description":"Test","priority":"low","assignedTo":"arquitecto"}' \
  | jq -r '._id')

# Cancel immediately
curl -X POST http://localhost:3100/api/tasks/$TASK_ID2/cancel
```
- [ ] Response status: 200
- [ ] `status: "cancelled"`
- [ ] Output contiene: "🛑 Task execution cancelled"

## 4. Real-Time WebSocket Tests

### 4.1 WebSocket Connection
- [ ] Abrir DevTools → Network → WS
- [ ] Ver conexión a `ws://localhost:3100/ws`
- [ ] Status: 101 Switching Protocols
- [ ] Recibir mensaje inicial de tipo `metrics_update`

### 4.2 Task Execution Streaming (Frontend)
1. Abrir frontend: http://localhost:5173
2. Ir a TaskBoard
3. Crear nueva tarea:
   - Title: "Streaming test"
   - Description: "Write hello world in 3 languages"
   - Assign to: arquitecto
4. Click en tarea → "Execute Task"

- [ ] Modal se abre
- [ ] Status cambia a "in_progress"
- [ ] Output console muestra "🚀 Starting task execution..."
- [ ] Output aparece en tiempo real
- [ ] Status final cambia a "completed" o "failed"
- [ ] Modal muestra resultado final

### 4.3 Agent Status Updates (Frontend)
1. Abrir Dashboard
2. Verificar badges de agentes muestran "Healthy"
3. En terminal: `docker stop openclaw-arquitecto`

- [ ] Badge de arquitecto cambia a "Offline" (en ~30s)
- [ ] Mensaje: "(Container stopped)"

4. En terminal: `docker start openclaw-arquitecto`

- [ ] Backend logs: `[OpenClaw] Attempting to reconnect agent arquitecto...`
- [ ] Backend logs: `[OpenClaw] ✅ Agent arquitecto connected`
- [ ] Badge de arquitecto cambia a "Healthy"
- [ ] Métricas vuelven a aparecer

## 5. Component Integration Tests

### 5.1 AgentOutputConsole Component
- [ ] Console renderiza correctamente
- [ ] Timestamps visibles
- [ ] Filtros funcionan (All, Output, Errors, Tools)
- [ ] Auto-scroll funciona
- [ ] Copy to clipboard funciona
- [ ] Line count correcto
- [ ] Icons por tipo correctos (📝, ❌, 🔧, ✅)

### 5.2 TaskExecutionModal Component
- [ ] Modal abre correctamente
- [ ] Task info visible (title, description, priority, agent)
- [ ] Progress bar aparece cuando hay progreso
- [ ] Botón "Start Execution" habilitado cuando task asignado
- [ ] Botón "Cancel Execution" aparece cuando executing
- [ ] Error display funciona
- [ ] Output console integrado funciona
- [ ] Modal cierra correctamente

### 5.3 RealTimeAgentStatus Component
- [ ] Status badge correcto (color, icon, label)
- [ ] Métricas visibles (CPU, RAM, Uptime)
- [ ] Response time visible
- [ ] Last sync timestamp actualizado
- [ ] Status cambia en tiempo real

## 6. Error Handling Tests

### 6.1 Gateway Connection Error
1. Detener container: `docker stop openclaw-arquitecto`
2. Intentar ejecutar tarea asignada a arquitecto

- [ ] Error response: "Agent arquitecto is not connected"
- [ ] Backend logs: Gateway error
- [ ] Frontend muestra error message

### 6.2 Task Without Agent
```bash
curl -X POST http://localhost:3100/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"No agent","description":"Test","priority":"low"}'

TASK_ID=$(curl ...)
curl -X POST http://localhost:3100/api/tasks/$TASK_ID/execute
```
- [ ] Error: "Task ... is not assigned to any agent"
- [ ] Status code: 500

### 6.3 Invalid Task ID
```bash
curl -X POST http://localhost:3100/api/tasks/invalidid123/execute
```
- [ ] Error: "Task invalidid123 not found"
- [ ] Status code: 500

### 6.4 RPC Timeout (Simulated)
1. Reducir RPC_TIMEOUT a 5 segundos (en código)
2. Crear tarea muy larga
3. Ejecutar

- [ ] Timeout después de 5s
- [ ] Error logged
- [ ] Task status → "failed"
- [ ] Output contiene error message

## 7. Performance Tests

### 7.1 Multiple Concurrent Tasks
```bash
# Ejecutar 5 tareas simultáneamente
for i in {1..5}; do
  curl -X POST http://localhost:3100/api/tasks \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"Task $i\",\"description\":\"Test\",\"priority\":\"low\",\"assignedTo\":\"arquitecto\"}" &
done
wait
```
- [ ] Todas las tareas creadas
- [ ] Backend maneja concurrencia correctamente
- [ ] No memory leaks
- [ ] WebSocket broadcast funciona para todas

### 7.2 Output Streaming Performance
1. Tarea que genera mucho output (ej: "List all files recursively in /var")
2. Ejecutar

- [ ] Output aparece en tiempo real
- [ ] Frontend no se cuelga
- [ ] Auto-scroll funciona con muchas líneas
- [ ] Copy to clipboard funciona

### 7.3 Long-Running Task
1. Tarea larga (ej: "Write comprehensive documentation")
2. Ejecutar
3. Verificar durante ejecución:

- [ ] Heartbeat mantiene conexión viva
- [ ] Status sync sigue funcionando
- [ ] WebSocket no se desconecta
- [ ] Frontend sigue recibiendo updates

## 8. Integration Tests

### 8.1 End-to-End Task Flow
1. Frontend: Crear tarea
2. Frontend: Asignar a arquitecto
3. Frontend: Ejecutar tarea
4. Verificar:

- [ ] Task creada en MongoDB
- [ ] RPC enviado a OpenClaw
- [ ] Output capturado en AgentOutput collection
- [ ] Task status actualizado en MongoDB
- [ ] Frontend muestra resultado final
- [ ] WebSocket broadcast funcionó en cada paso

### 8.2 Agent Handoff During Execution
1. Crear tarea asignada a arquitecto
2. Ejecutar
3. Durante ejecución: handoff a developer

- [ ] Ejecución se detiene
- [ ] Task status → pending
- [ ] assignedTo actualizado
- [ ] Nueva ejecución puede iniciarse con developer

### 8.3 Container Restart Recovery
1. Container running, tarea ejecutándose
2. `docker restart openclaw-arquitecto`

- [ ] Auto-reconexión exitosa
- [ ] StatusSync detecta cambio
- [ ] Frontend actualiza status
- [ ] Nueva tarea puede ejecutarse

## 9. Cleanup & Validation

### 9.1 Graceful Shutdown
1. `Ctrl+C` en backend

- [ ] Logs: "Shutting down all gateway connections..."
- [ ] Todos los agentes desconectados
- [ ] StatusSync detenido
- [ ] WebSocket connections cerradas
- [ ] Sin errores en shutdown

### 9.2 Data Validation
- [ ] MongoDB collection `tasks` actualizada
- [ ] MongoDB collection `agentoutputs` contiene logs
- [ ] MongoDB collection `interactions` contiene actividad
- [ ] No documentos huérfanos
- [ ] Indexes creados correctamente

## Summary

**Total Tests:** ~80+

**Critical Path:**
1. ✅ Backend initialization
2. ✅ Gateway connections
3. ✅ Task execution
4. ✅ Real-time updates
5. ✅ Error handling
6. ✅ Graceful shutdown

**Pass Criteria:**
- [ ] Todos los tests críticos pasan
- [ ] No errors en logs (excepto tests de error handling)
- [ ] Frontend responsive y sin crashes
- [ ] WebSocket estable durante sesión larga
- [ ] MongoDB data consistente

---

**Tested By:** _______________  
**Date:** _______________  
**Version:** 1.0.0  
**Status:** ⬜ Pass / ⬜ Fail / ⬜ Partial
