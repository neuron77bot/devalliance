# DevAlliance Skills & Task Workflow System

Sistema completo de ejecución de tareas con agentes OpenClaw y notificaciones en tiempo real.

## 📋 Tabla de Contenidos

- [Descripción](#descripción)
- [Arquitectura](#arquitectura)
- [Componentes](#componentes)
- [Skills Disponibles](#skills-disponibles)
- [Workflow de Ejecución](#workflow-de-ejecución)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Configuración](#configuración)
- [Troubleshooting](#troubleshooting)

## Descripción

Sistema que permite a agentes OpenClaw ejecutar tareas asignadas desde Mission Control, notificando automáticamente su progreso mediante skills. Los agentes usan el skill `devalliance-notify` para reportar inicio, completación o fallo de tareas, actualizando el estado en tiempo real.

**Características principales:**

- ✅ Ejecución de tareas distribuida entre agentes
- ✅ Notificaciones automáticas vía callbacks HTTP
- ✅ Skills montados automáticamente en contenedores
- ✅ Validación de autenticación por token
- ✅ Actualización de estado en tiempo real (WebSocket)
- ✅ Logging completo de interacciones
- ✅ Comentarios automáticos según resultado

## Arquitectura

```
┌──────────────────────────────────────────────────────────────────┐
│                      Mission Control                              │
│                    (Backend Fastify)                              │
│                                                                    │
│  POST /api/tasks              ┌────────────────┐                 │
│  PUT /api/tasks/:id/assign    │  TaskService   │                 │
│  POST /api/tasks/:id/execute  │                │                 │
│         │                      │ buildPrompt()  │                 │
│         └─────────────────────►│ executeTask()  │                 │
│                                │ handleCallback()│                 │
│                                └────────┬───────┘                 │
│                                         │                          │
│                                         │ RPC (chat.send)          │
└─────────────────────────────────────────┼──────────────────────────┘
                                          │
                                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Agente OpenClaw                               │
│                  (Docker Container)                               │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Workspace: /home/node/.openclaw/workspace/               │   │
│  │                                                            │   │
│  │  skills/                                                   │   │
│  │    └── devalliance-notify/                                │   │
│  │         ├── SKILL.md                                       │   │
│  │         ├── notify-task.sh                                 │   │
│  │         └── README.md                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                    │
│  1. Read SKILL.md                                                 │
│  2. exec ./skills/devalliance-notify/notify-task.sh ID started   │
│  3. Execute task (write, exec, etc.)                              │
│  4. exec ./skills/devalliance-notify/notify-task.sh ID completed │
│                                                                    │
└──────────────────────────┬────────────────────────────────────────┘
                           │
                           │ HTTP POST (callback)
                           │ x-agent-token: mati
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                POST /api/tasks/:id/callback                       │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ TaskService.handleCallback()                                │ │
│  │                                                              │ │
│  │ 1. Validate token (agentToken == task.assignedTo)          │ │
│  │ 2. Map status (started → in_progress)                       │ │
│  │ 3. Change task status                                       │ │
│  │ 4. Add auto-comment                                         │ │
│  │ 5. Log to AgentOutput                                       │ │
│  │ 6. Broadcast WebSocket                                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

## Componentes

### 1. Skills Directory

**Ubicación:** `/var/www/devalliance/openclaw-containers/skills/`

Directorio compartido entre todos los agentes OpenClaw. Cada skill contiene:

- `SKILL.md` - Documentación para el agente
- Scripts ejecutables
- `README.md` - Documentación técnica

**Montaje en contenedores:**

```yaml
volumes:
  - /var/www/devalliance/openclaw-containers/skills:/home/node/.openclaw/workspace/skills:ro
```

**Configuración automática en `openclaw.json`:**

```json
{
  "skillsPaths": [
    "/home/node/.openclaw/workspace/skills"
  ]
}
```

### 2. Skill: devalliance-notify

Skill principal para notificaciones de progreso de tareas.

**Archivos:**

- `SKILL.md` (1.5K) - Instrucciones para el agente
- `notify-task.sh` (1.1K) - Script de notificación
- `README.md` (7.1K) - Documentación técnica

**Uso:**

```bash
./skills/devalliance-notify/notify-task.sh <taskId> <status> [result] [error]
```

**Parámetros:**

- `taskId` (required): MongoDB ObjectId de la tarea
- `status` (required): `started` | `completed` | `failed`
- `result` (optional): Descripción del resultado (para completed)
- `error` (optional): Mensaje de error (para failed)

**Variables de entorno:**

- `DEVALLIANCE_BACKEND_URL` - URL del backend (default: http://localhost:3101)
- `OPENCLAW_AGENT_ID` - ID del agente (usado como token)

### 3. Backend API

#### Endpoint: POST /api/tasks/:id/callback

Recibe notificaciones de progreso desde agentes.

**Headers:**

```
Content-Type: application/json
x-agent-token: <OPENCLAW_AGENT_ID>
```

**Request Body:**

```json
{
  "status": "started|completed|failed",
  "result": "Descripción opcional del resultado",
  "error": "Mensaje de error opcional",
  "timestamp": "2026-03-03T00:54:08.828Z"
}
```

**Response:**

```json
{
  "success": true,
  "taskId": "69a6311adecad172cd35283e",
  "newStatus": "completed"
}
```

**Errores:**

- `401` - Missing agent token
- `404` - Task not found
- `400` - Invalid status or token mismatch

### 4. TaskService

Servicio principal de gestión de tareas.

**Métodos clave:**

- `executeTask(taskId)` - Despacha tarea al agente vía RPC
- `handleCallback(taskId, agentToken, status, result?, error?)` - Procesa callbacks
- `buildTaskPrompt(task)` - Genera prompt con instrucciones del skill

**Validaciones:**

- ✅ Token del agente coincide con `task.assignedTo`
- ✅ Transiciones de estado válidas (state machine)
- ✅ Tarea existe y está asignada
- ✅ Agente está conectado al gateway

### 5. DockerService

Gestiona contenedores de agentes OpenClaw.

**Montaje automático de skills:**

```typescript
const dockerCmd = [
  'docker run -d',
  `--name ${containerName}`,
  '--network host',
  `-v ${openclawDir}:/home/node/.openclaw`,
  '-v /var/www/devalliance/openclaw-containers/skills:/home/node/.openclaw/workspace/skills:ro',
  `--env-file ${instancePath}/.env`,
  '--restart unless-stopped',
  'openclaw:local'
].join(' ');
```

**Configuración automática:**

```json
{
  "gateway": {
    "bind": "lan",
    "port": 18795,
    "mode": "local"
  },
  "skillsPaths": [
    "/home/node/.openclaw/workspace/skills"
  ]
}
```

## Skills Disponibles

### devalliance-notify

**Propósito:** Notificar progreso de tareas al backend

**Estados soportados:**

| Status | Uso | Task Status Mapping |
|--------|-----|---------------------|
| `started` | Al comenzar ejecución | `assigned` → `in_progress` |
| `completed` | Cuando termina exitosamente | `in_progress` → `completed` |
| `failed` | Cuando falla con error | `in_progress` → `failed` |

**Comentarios automáticos:**

- `started` → "⏳ Task execution started"
- `completed` → "✅ Task completed: {result}"
- `failed` → "❌ Task failed: {error}"

**Ejemplo de uso en agente:**

```bash
# Paso 1: Leer skill
read /home/node/.openclaw/workspace/skills/devalliance-notify/SKILL.md

# Paso 2: Notificar inicio
exec ./skills/devalliance-notify/notify-task.sh 69a6311adecad172cd35283e started

# Paso 3: Ejecutar tarea
write /tmp/test.txt "Hello World"

# Paso 4: Notificar completación
exec ./skills/devalliance-notify/notify-task.sh 69a6311adecad172cd35283e completed "Created /tmp/test.txt successfully"
```

## Workflow de Ejecución

### Flujo Completo

```
1. CREAR TAREA
   POST /api/tasks
   Body: { title, description, priority }
   → Task status: pending

2. ASIGNAR AGENTE
   PUT /api/tasks/:id/assign
   Body: { agentId: "mati" }
   → Task status: assigned

3. EJECUTAR TAREA
   POST /api/tasks/:id/execute
   → Backend envía RPC (chat.send) al agente
   → Task mantiene status: assigned

4. AGENTE RECIBE PROMPT
   TASK EXECUTION REQUEST
   
   Task ID: 69a6311adecad172cd35283e
   Title: Test devalliance-notify skill
   Description: ...
   
   INSTRUCTIONS:
   1. Read the devalliance-notify skill
   2. Notify task START
   3. Execute the task
   4. Notify task RESULT

5. AGENTE EJECUTA WORKFLOW
   a) Lee SKILL.md
   b) Ejecuta: notify-task.sh :id started
   c) Ejecuta la tarea (write, exec, etc.)
   d) Ejecuta: notify-task.sh :id completed "description"

6. CALLBACKS AL BACKEND
   Callback 1: POST /api/tasks/:id/callback
   Body: { status: "started" }
   → Task status: in_progress
   → Comment: "⏳ Task execution started"
   
   Callback 2: POST /api/tasks/:id/callback
   Body: { status: "completed", result: "..." }
   → Task status: completed
   → Comment: "✅ Task completed: ..."

7. ACTUALIZACIÓN REAL-TIME
   → WebSocket broadcast a todos los clientes
   → Dashboard actualiza task card
   → Interacciones visibles en UI
```

### State Machine

```
pending ──┬──► assigned ──► in_progress ──┬──► completed
          │                               │
          │                               ├──► failed
          │                               │
          │                               └──► paused ──► in_progress
          │
          └──────────────────────────────────► cancelled
```

**Transiciones válidas:**

- `pending` → assigned, cancelled
- `assigned` → in_progress, pending, cancelled
- `in_progress` → paused, completed, failed, cancelled
- `paused` → in_progress, cancelled
- `completed` → (terminal)
- `failed` → pending, cancelled
- `cancelled` → (terminal)

## API Reference

### Crear Tarea

```bash
POST /api/tasks
Content-Type: application/json

{
  "title": "Deploy backend to production",
  "description": "Build Docker image and deploy to VPS",
  "priority": "high",
  "estimatedDuration": 30,
  "tags": ["deployment", "backend"]
}
```

### Asignar Tarea

```bash
PUT /api/tasks/:id/assign
Content-Type: application/json

{
  "agentId": "mati"
}
```

### Ejecutar Tarea

```bash
POST /api/tasks/:id/execute

# Response:
{
  "success": true,
  "taskId": "69a6311adecad172cd35283e",
  "message": "Task execution started",
  "result": {
    "runId": "task-69a6311adecad172cd35283e-1772499241516",
    "status": "started"
  }
}
```

### Callback desde Agente

```bash
POST /api/tasks/:id/callback
Content-Type: application/json
x-agent-token: mati

{
  "status": "completed",
  "result": "Created /tmp/test.txt with content 'Hello from DevAlliance'"
}

# Response:
{
  "success": true,
  "taskId": "69a6311adecad172cd35283e",
  "newStatus": "completed"
}
```

### Obtener Interacciones

```bash
GET /api/tasks/:id/interactions

# Response:
[
  {
    "type": "assignment",
    "toAgent": "mati",
    "message": "Task assigned to mati",
    "timestamp": "2026-03-03T00:53:50.961Z"
  },
  {
    "type": "status_change",
    "fromAgent": "mati",
    "message": "Status changed from assigned to in_progress",
    "metadata": {
      "fromStatus": "assigned",
      "toStatus": "in_progress"
    },
    "timestamp": "2026-03-03T00:54:08.829Z"
  },
  {
    "type": "comment",
    "fromAgent": "mati",
    "message": "⏳ Task execution started",
    "timestamp": "2026-03-03T00:54:08.830Z"
  },
  {
    "type": "comment",
    "fromAgent": "mati",
    "message": "✅ Task completed: Created /tmp/test.txt successfully",
    "timestamp": "2026-03-03T00:54:17.849Z"
  }
]
```

## Testing

### Test E2E Completo

```bash
# 1. Crear tarea de prueba
TASK_ID=$(curl -s -X POST http://localhost:3101/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test devalliance-notify skill",
    "description": "Crear archivo /tmp/test-skill.txt con contenido: Hello from DevAlliance",
    "priority": "high",
    "estimatedDuration": 5
  }' | jq -r '._id')

echo "Task created: $TASK_ID"

# 2. Asignar a agente
curl -s -X PUT http://localhost:3101/api/tasks/$TASK_ID/assign \
  -H "Content-Type: application/json" \
  -d '{"agentId": "mati"}' | jq '.status'
# → "assigned"

# 3. Ejecutar tarea
curl -s -X POST http://localhost:3101/api/tasks/$TASK_ID/execute | jq

# 4. Esperar 15 segundos para ejecución completa
sleep 15

# 5. Verificar estado final
curl -s http://localhost:3101/api/tasks/$TASK_ID | jq '.status'
# → "completed"

# 6. Verificar interacciones
curl -s http://localhost:3101/api/tasks/$TASK_ID/interactions | jq

# 7. Verificar archivo creado
docker exec openclaw-mati cat /tmp/test-skill.txt
# → "Hello from DevAlliance"
```

### Resultado Esperado

**Timeline:**

```
00:53:46 ✅ Tarea creada
00:53:50 ✅ Tarea asignada (pending → assigned)
00:54:01 ✅ Ejecución iniciada (dispatch)
00:54:08 ✅ CALLBACK: started (assigned → in_progress)
00:54:17 ✅ CALLBACK: completed (in_progress → completed)

⏱️ Duración total: 9 segundos
```

**Interacciones registradas:**

1. Assignment → "Task assigned to mati"
2. Status Change → "assigned → in_progress"
3. Comment → "⏳ Task execution started"
4. Status Change → "in_progress → completed"
5. Comment → "✅ Task completed: Created /tmp/test-skill.txt..."

### Verificar Logs

```bash
# Backend logs
docker logs devalliance-backend --tail 50

# Agent logs
docker logs openclaw-mati --tail 50

# Buscar callbacks
docker logs devalliance-backend --since 5m | grep callback
```

## Configuración

### Agregar Nuevo Agente

```bash
# 1. Crear agente via API
curl -X POST http://localhost:3101/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "id": "developer",
    "name": "Developer",
    "role": "FullStack Developer",
    "description": "Expert in Node.js and React"
  }'

# 2. El contenedor se crea automáticamente con:
#    - Skills montados en /home/node/.openclaw/workspace/skills
#    - skillsPaths configurado en openclaw.json
#    - Variables de entorno (OPENCLAW_AGENT_ID, etc.)

# 3. Verificar que el agente puede acceder a skills
docker exec openclaw-developer ls /home/node/.openclaw/workspace/skills/devalliance-notify/
```

### Crear Nuevo Skill

```bash
# 1. Crear directorio del skill
mkdir -p /var/www/devalliance/openclaw-containers/skills/my-new-skill

# 2. Crear SKILL.md (documentación para agentes)
cat > /var/www/devalliance/openclaw-containers/skills/my-new-skill/SKILL.md <<EOF
# My New Skill

Description of what this skill does.

## Usage

\`\`\`bash
./skills/my-new-skill/script.sh <args>
\`\`\`
EOF

# 3. Crear script ejecutable
cat > /var/www/devalliance/openclaw-containers/skills/my-new-skill/script.sh <<'EOF'
#!/bin/bash
set -euo pipefail

echo "Hello from new skill!"
EOF

chmod +x /var/www/devalliance/openclaw-containers/skills/my-new-skill/script.sh

# 4. Crear README.md (documentación técnica)
cat > /var/www/devalliance/openclaw-containers/skills/my-new-skill/README.md <<EOF
# My New Skill

Technical documentation for developers.
EOF

# 5. El skill estará disponible inmediatamente en todos los agentes
docker exec openclaw-mati ls /home/node/.openclaw/workspace/skills/
```

### Variables de Entorno

**Backend (.env):**

```env
ANTHROPIC_API_KEY=sk-ant-...
MONGODB_URI=mongodb://localhost:27017/devalliance
PORT=3101
```

**Agente (auto-generado por DockerService):**

```env
OPENCLAW_GATEWAY_TOKEN=<random-token>
OPENCLAW_AGENT_ID=mati
OPENCLAW_GATEWAY_PORT=18795
ANTHROPIC_API_KEY=<from-backend-env>
```

## Troubleshooting

### Agente no encuentra el skill

```bash
# Verificar montaje
docker exec openclaw-mati ls -la /home/node/.openclaw/workspace/skills/

# Verificar skillsPaths
docker exec openclaw-mati cat /home/node/.openclaw/config/openclaw.json

# Recrear contenedor si necesario
curl -X DELETE http://localhost:3101/api/agents/mati
curl -X POST http://localhost:3101/api/agents \
  -H "Content-Type: application/json" \
  -d '{"id":"mati","name":"Mati","role":"Developer","description":"Senior Developer"}'
```

### Error 401: Missing agent token

El script `notify-task.sh` usa la variable `OPENCLAW_AGENT_ID` como token.

```bash
# Verificar variable de entorno
docker exec openclaw-mati env | grep OPENCLAW_AGENT_ID

# Debe devolver el ID del agente (ej: mati)
```

### Error: Agent token mismatch

La tarea está asignada a un agente diferente.

```bash
# Verificar asignación de tarea
curl http://localhost:3101/api/tasks/:id | jq '.assignedTo'

# Debe coincidir con el agente que envía el callback
```

### Tarea se queda en "assigned"

El agente no está ejecutando el workflow correctamente.

```bash
# Ver logs del agente
docker logs openclaw-mati --tail 100

# Buscar errores en ejecución del skill
docker logs openclaw-mati | grep "devalliance-notify"

# Verificar conectividad del agente
curl http://localhost:3101/api/agents/mati/status
```

### Backend no recibe callbacks

```bash
# Verificar network mode del agente
docker inspect openclaw-mati | grep NetworkMode
# Debe ser: "host"

# Verificar conectividad desde agente
docker exec openclaw-mati curl -s http://localhost:3101/health

# Ver logs del backend
docker logs devalliance-backend --tail 50 | grep callback
```

## Próximas Mejoras

### Skills Planeados

- [ ] **git-operations** - Clone, pull, push, diff, branch management
- [ ] **nginx-control** - Reload, test config, manage sites
- [ ] **docker-control** - List containers, logs, restart
- [ ] **log-analyzer** - Parse y analizar logs de aplicaciones
- [ ] **deployment** - Scripts de deploy automático

### Features

- [ ] Retry automático en caso de error de callback
- [ ] Queue de callbacks para batch processing
- [ ] Progress percentages (0-100%)
- [ ] Streaming de logs en tiempo real
- [ ] Attachments en callbacks (screenshots, archivos)
- [ ] Webhook notifications a Telegram/Discord
- [ ] Rate limiting en skills
- [ ] Audit log de operaciones sensibles
- [ ] Skills hot-reload sin recrear contenedores
- [ ] Skill versioning

### Seguridad

- [ ] Whitelist de comandos permitidos por skill
- [ ] Sandbox mode para ejecución segura
- [ ] Firma digital de scripts
- [ ] Audit trail de todas las ejecuciones
- [ ] Role-based access control (RBAC) para skills

## Contribuir

### Agregar un Nuevo Skill

1. Fork el repositorio
2. Crear directorio en `openclaw-containers/skills/`
3. Agregar `SKILL.md`, scripts y `README.md`
4. Hacer scripts ejecutables (`chmod +x`)
5. Testear con agente local
6. Enviar Pull Request

### Estándares de Skills

- `SKILL.md` debe ser claro y conciso para agentes AI
- Scripts deben tener manejo de errores robusto
- Usar `set -euo pipefail` en scripts bash
- Documentar todas las variables de entorno requeridas
- Incluir ejemplos en `README.md`
- Mantener scripts simples y enfocados

---

**Versión:** 1.0.0  
**Última actualización:** 2 Marzo 2026  
**Estado:** ✅ Operacional  
**Testing:** ✅ E2E Completado
