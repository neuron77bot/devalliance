# OpenClaw Integration - Technical Documentation

## Overview

DevAlliance Mission Control ahora está completamente integrado con OpenClaw Gateways para ejecutar tareas reales en agentes autónomos. Esta integración permite:

- ✅ Conexión WebSocket bidireccional con gateways OpenClaw
- ✅ Ejecución de tareas mediante RPC (Remote Procedure Call)
- ✅ Streaming de outputs en tiempo real
- ✅ Sincronización de estado de contenedores Docker
- ✅ Auto-reconexión y manejo de errores robusto
- ✅ Interfaz de usuario con consola de output y métricas en vivo

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DevAlliance Frontend                        │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐   │
│  │  Dashboard  │  │  TaskBoard  │  │  AgentOutputConsole  │   │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬───────────┘   │
│         │                 │                     │                │
│         └─────────────────┴─────────────────────┘                │
│                           │                                      │
│                    WebSocket (ws://)                             │
│                           │                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────────┐
│                     DevAlliance Backend                          │
│                           │                                      │
│  ┌────────────────────────┴──────────────────────────┐          │
│  │           WebSocket Plugin (Broadcast)             │          │
│  └────────────────────────┬──────────────────────────┘          │
│                           │                                      │
│  ┌────────────────────────┴──────────────────────────┐          │
│  │              TaskService (EventEmitter)            │          │
│  │   - executeTask(taskId)                            │          │
│  │   - cancelTask(taskId)                             │          │
│  │   - handleTaskResult(taskId, result)               │          │
│  └────────────────────────┬──────────────────────────┘          │
│                           │                                      │
│  ┌────────────────────────┴──────────────────────────┐          │
│  │        OpenClawGatewayService (RPC Client)         │          │
│  │   - connectAgent(agentId)                          │          │
│  │   - sendRPC(agentId, method, params)               │          │
│  │   - healthCheck(agentId)                           │          │
│  └────────────────────────┬──────────────────────────┘          │
│                           │                                      │
│  ┌────────────────────────┴──────────────────────────┐          │
│  │         StatusSyncService (Polling)                │          │
│  │   - syncAllAgents() (every 30s)                    │          │
│  │   - getContainerStats(agentId)                     │          │
│  └────────────────────────┬──────────────────────────┘          │
│                           │                                      │
│  ┌────────────────────────┴──────────────────────────┐          │
│  │            DockerService (Stats & Inspect)         │          │
│  └────────────────────────────────────────────────────┘          │
└───────────────────────────┼──────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              │ WebSocket (RPC/JSON-RPC)  │
              │                           │
┌─────────────┴──────────┐   ┌───────────┴────────────┐
│  OpenClaw Gateway      │   │  OpenClaw Gateway      │
│  (arquitecto)          │   │  (developer)           │
│  ws://...:18789        │   │  ws://...:18789        │
│  Token: ed1b3f...      │   │  Token: f64422...      │
└────────────────────────┘   └────────────────────────┘
```

## Backend Implementation

### 1. OpenClawGatewayService (`backend/src/services/OpenClawGatewayService.ts`)

**Responsabilidades:**
- Gestionar conexiones WebSocket con gateways OpenClaw
- Enviar comandos RPC (JSON-RPC 2.0)
- Auto-reconexión con backoff exponencial
- Heartbeat/ping cada 30 segundos
- Emitir eventos para broadcast en tiempo real

**Métodos principales:**
```typescript
class OpenClawGatewayService extends EventEmitter {
  async connectAgent(agentId: string): Promise<void>
  async disconnectAgent(agentId: string): Promise<void>
  async sendRPC(agentId: string, method: string, params?: any): Promise<any>
  async healthCheck(agentId: string): Promise<boolean>
  async getAgentInfo(agentId: string): Promise<any>
  getConnectionStatus(agentId: string): 'connected' | 'disconnected' | 'error' | 'unknown'
  async initializeAllAgents(): Promise<void>
  async shutdown(): Promise<void>
}
```

**Eventos emitidos:**
- `agent:connected` - Agente conectado exitosamente
- `agent:disconnected` - Agente desconectado
- `agent:error` - Error en conexión
- `agent:notification` - Notificación desde gateway (RPC sin ID)
- `agent:message` - Mensaje genérico

**RPC Protocol:**
```json
// Request
{
  "jsonrpc": "2.0",
  "method": "sessions.send",
  "params": {
    "message": "Task prompt here",
    "context": { "taskId": "..." }
  },
  "id": 12345
}

// Response
{
  "jsonrpc": "2.0",
  "result": { ... },
  "id": 12345
}
```

**Auto-Reconnection:**
- Max intentos: 5
- Delay: 5s * attemptNumber (backoff exponencial)
- Reset del contador al conectarse exitosamente

### 2. TaskService (`backend/src/services/TaskService.ts`)

**Nuevos métodos:**
```typescript
async executeTask(taskId: string): Promise<any>
async cancelTask(taskId: string, agentId?: string): Promise<any>
async getTaskOutput(taskId: string, limit?: number): Promise<AgentOutput[]>
async getAgentOutput(agentId: string, limit?: number): Promise<AgentOutput[]>
async handleTaskResult(taskId: string, result: any): Promise<void>
```

**Workflow de ejecución:**
1. Verificar que tarea existe y está asignada
2. Verificar que agente está conectado
3. Construir prompt desde task data
4. Cambiar status → `in_progress`
5. Enviar RPC `sessions.send` con prompt
6. Capturar resultado
7. Cambiar status → `completed` o `failed`
8. Broadcast via WebSocket a frontend

**Task Prompt Template:**
```
Task ID: {taskId}
Title: {title}
Description: {description}
Priority: {priority}
Estimated Duration: {estimatedDuration} minutes

Please execute this task and report back when completed.
Include any code, files created, or actions taken.
```

### 3. StatusSyncService (`backend/src/services/StatusSyncService.ts`)

**Responsabilidades:**
- Sincronización periódica de estado (cada 30s)
- Health checks via gateway RPC
- Obtener stats de contenedores Docker
- Broadcast de cambios de estado

**Métodos:**
```typescript
class StatusSyncService extends EventEmitter {
  startPeriodicSync(intervalMs?: number): void
  stopPeriodicSync(): void
  async syncAllAgents(): Promise<void>
  async syncAgent(agentId: string): Promise<AgentStatus>
  async isContainerRunning(agentId: string): Promise<boolean>
  async getContainerStats(agentId: string): Promise<any>
  async forceReconnect(agentId: string): Promise<void>
}
```

**AgentStatus:**
```typescript
interface AgentStatus {
  agentId: string;
  status: 'healthy' | 'offline' | 'error';
  containerRunning: boolean;
  gatewayConnected: boolean;
  metrics?: {
    cpu?: number;
    memory?: number;
    uptime?: number;
  };
  responseTime?: number;
  lastSync: Date;
}
```

**Lógica de determinación de estado:**
- `offline`: Container stopped
- `error`: Container running pero gateway disconnected
- `healthy`: Container running Y gateway connected

### 4. AgentOutput Model (`backend/src/models/AgentOutput.model.ts`)

**Schema:**
```typescript
interface IAgentOutput {
  agentId: string;
  taskId?: string;
  type: 'output' | 'progress' | 'tool_call' | 'error' | 'result';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}
```

**Indexes:**
- `{ agentId: 1, timestamp: -1 }`
- `{ taskId: 1, timestamp: -1 }`

### 5. Gateway Routes (`backend/src/routes/gateway.routes.ts`)

**Endpoints:**
```
POST   /api/agents/:id/connect         - Conectar a gateway
POST   /api/agents/:id/disconnect      - Desconectar gateway
GET    /api/agents/:id/output          - Stream de outputs
GET    /api/agents/:id/gateway-status  - Gateway status en tiempo real
POST   /api/agents/:id/reconnect       - Forzar reconexión

POST   /api/tasks/:id/execute          - Ejecutar tarea
POST   /api/tasks/:id/cancel           - Cancelar ejecución
GET    /api/tasks/:id/output           - Output de ejecución

POST   /api/gateway/rpc                - RPC directo (testing)
GET    /api/gateway/status             - Status global de gateways
```

### 6. WebSocket Plugin (`backend/src/plugins/websocket.ts`)

**Broadcast helper:**
```typescript
fastify.websocketBroadcast.send(type: string, data: any)
```

**Eventos broadcasted:**
- `agent:connected`
- `agent:disconnected`
- `agent:error`
- `agent:output` - Output de agentes (logs, resultados)
- `agent:status` - Updates de estado
- `task_updated` - Task status changes
- `metrics_update` - Métricas del sistema

## Frontend Implementation

### 1. Hooks

#### `useAgentOutput(agentId, taskId?)`
```typescript
const { outputs, loading, error, clearOutputs } = useAgentOutput('arquitecto', taskId);
```
- Carga outputs iniciales desde API
- Suscribe a updates en tiempo real via WebSocket
- Filtra por agentId y opcionalmente por taskId

#### `useTaskExecution(taskId)`
```typescript
const {
  status,
  progress,
  output,
  isExecuting,
  error,
  startExecution,
  cancelExecution,
  clearOutput
} = useTaskExecution(taskId);
```
- Gestiona ejecución de tareas
- Actualiza estado en tiempo real
- Captura progress updates

### 2. Components

#### `AgentOutputConsole`
```tsx
<AgentOutputConsole
  outputs={outputs}
  autoScroll={true}
  maxHeight="400px"
  showTimestamps={true}
  filterTypes={['output', 'error']}
/>
```

**Features:**
- Terminal-like console con syntax highlighting
- Auto-scroll a nuevos mensajes
- Filtros por tipo (output, error, tool, all)
- Copy to clipboard
- Timestamps opcionales
- Icons por tipo de mensaje

#### `TaskExecutionModal`
```tsx
<TaskExecutionModal
  task={task}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
/>
```

**Features:**
- Modal con detalles de ejecución
- Progress bar animada
- Output console integrado
- Botones: Start / Cancel / Close
- Error display
- Status badges

#### `RealTimeAgentStatus`
```tsx
<RealTimeAgentStatus
  agentId="arquitecto"
  showMetrics={true}
/>
```

**Features:**
- Badge con status actualizado en tiempo real
- Métricas: CPU, RAM, Uptime
- Response time
- Last sync timestamp
- Visual indicators (colores, icons)

### 3. Types

**`agent-output.ts`:**
```typescript
export type OutputType = 'output' | 'progress' | 'tool_call' | 'error' | 'result';

export interface AgentOutput {
  _id: string;
  agentId: string;
  taskId?: string;
  type: OutputType;
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
```

## Testing

### 1. Health Check Test
```bash
# Backend logs
cd /var/www/devalliance/backend
npm run dev

# Should see:
# [OpenClaw] Initializing connections for all agents...
# [OpenClaw] Found 2 agents with gateway configuration
# [OpenClaw] Connecting to agent arquitecto at ws://openclaw-arquitecto:18789...
# [OpenClaw] ✅ Agent arquitecto connected
# [OpenClaw] Connecting to agent developer at ws://openclaw-developer:18789...
# [OpenClaw] ✅ Agent developer connected
```

### 2. Task Execution Test

**Via API:**
```bash
# 1. Crear tarea
curl -X POST http://localhost:3100/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "List files in current directory",
    "description": "Run ls -la and report the output",
    "priority": "medium",
    "assignedTo": "arquitecto"
  }'

# Response: { "_id": "...", "status": "assigned", ... }

# 2. Ejecutar tarea
curl -X POST http://localhost:3100/api/tasks/{taskId}/execute

# 3. Ver output
curl http://localhost:3100/api/tasks/{taskId}/output

# 4. Verificar status final
curl http://localhost:3100/api/tasks/{taskId}
# Should be: "status": "completed"
```

**Via Frontend:**
1. Abrir Dashboard
2. Ver agentes conectados (status: healthy)
3. Ir a TaskBoard
4. Crear tarea simple
5. Asignar a arquitecto
6. Click en tarea → "Execute Task"
7. Ver output en tiempo real
8. Verificar que status cambia a completed

### 3. Real-Time Updates Test

**Terminal 1 (Backend):**
```bash
cd /var/www/devalliance/backend
npm run dev
```

**Terminal 2 (Stop Container):**
```bash
docker stop openclaw-arquitecto
```

**Frontend:**
- Verificar que badge de arquitecto cambia a "Offline"
- Métricas desaparecen

**Terminal 2 (Start Container):**
```bash
docker start openclaw-arquitecto
```

**Frontend:**
- Auto-reconexión (verificar logs backend)
- Badge cambia a "Healthy"
- Métricas vuelven a aparecer

### 4. Message Streaming Test

**Tarea larga:**
```json
{
  "title": "Write Python web scraper",
  "description": "Create a Python script that scrapes headlines from HackerNews, saves to CSV, and includes error handling",
  "priority": "high",
  "assignedTo": "developer"
}
```

**Verificar:**
1. Output aparece en tiempo real
2. Tool calls se muestran con icon 🔧
3. Progress updates si los hay
4. Resultado final con ✅
5. Status final: completed

## Deployment

### Environment Variables

**Backend (`backend/.env`):**
```env
PORT=3100
HOST=0.0.0.0
MONGODB_URI=mongodb://localhost:27017/devalliance
NODE_ENV=development
```

### Docker Network

Todos los containers deben estar en la red `devalliance`:

```bash
# Verificar que backend está en la red
docker network inspect devalliance

# Si no está, agregar:
docker network connect devalliance devalliance-backend
```

### Container Names

OpenClaw containers deben seguir naming convention:
```
openclaw-{agentId}
```

Ejemplo:
- `openclaw-arquitecto`
- `openclaw-developer`

### Agent Configuration

Agents en MongoDB deben tener:
```json
{
  "agentId": "arquitecto",
  "name": "Arquitecto",
  "gateway": {
    "url": "ws://openclaw-arquitecto:18789",
    "token": "ed1b3f0d1d87cb0533e3d634f67d3c039ab464466aca9ff8"
  }
}
```

## Troubleshooting

### Gateway connection failed

**Síntoma:**
```
[OpenClaw] ❌ Error on agent arquitecto: Connection refused
```

**Solución:**
1. Verificar que container está running: `docker ps | grep openclaw-arquitecto`
2. Verificar que están en la misma red: `docker network inspect devalliance`
3. Verificar token: debe coincidir con el del agent en MongoDB
4. Verificar URL: debe usar hostname del container

### Auto-reconnection not working

**Síntoma:**
```
[OpenClaw] Max reconnect attempts reached for agent arquitecto
```

**Solución:**
1. Verificar que container existe: `docker ps -a | grep openclaw`
2. Si no existe, crear con nombre correcto
3. Si existe pero stopped, iniciar: `docker start openclaw-arquitecto`
4. Forzar reconexión: `POST /api/agents/arquitecto/reconnect`

### Task execution timeout

**Síntoma:**
```
RPC timeout for method sessions.send on agent arquitecto
```

**Solución:**
1. Incrementar `RPC_TIMEOUT` en OpenClawGatewayService (default: 30s)
2. Verificar que agente está realmente ejecutando (ver logs del container)
3. Para tareas largas, considerar usar progress updates

### WebSocket not broadcasting

**Síntoma:**
Frontend no recibe updates en tiempo real

**Solución:**
1. Verificar WebSocket connection en DevTools → Network → WS
2. Verificar que backend emite eventos correctamente (logs)
3. Verificar que `fastify.websocketBroadcast.send()` está disponible
4. Verificar que TaskService extiende EventEmitter

## Performance Considerations

### RPC Timeouts
- Default: 30 segundos
- Para tareas largas: usar progress updates intermedios
- Para streaming: considerar WebSocket notifications

### Status Sync Interval
- Default: 30 segundos
- Reducir para updates más frecuentes (mayor CPU/network usage)
- Aumentar para menor overhead

### WebSocket Heartbeat
- Default: 30 segundos
- Balance entre keep-alive y network usage

### MongoDB Queries
- AgentOutput tiene indexes en `agentId` y `taskId`
- Limitar queries con `limit` parameter
- Considerar TTL index para cleanup automático de outputs antiguos

## Future Enhancements

### Fase 6: Advanced Features (Not Implemented)

1. **Task Cancellation via RPC:**
   - Enviar señal de cancelación a OpenClaw
   - Interrupt task execution
   - Clean up resources

2. **Real-Time Handoff:**
   - Transferir sesión activa entre agentes
   - Pasar contexto completo (variables, estado)
   - Continuar ejecución sin perder progreso

3. **Collaborative Tasks:**
   - Múltiples agentes trabajando en la misma tarea
   - Chat inter-agente en tiempo real
   - Merge de resultados (conflict resolution)

4. **Advanced Output Filtering:**
   - Search/grep en outputs
   - Export to file (txt, json, csv)
   - Syntax highlighting para código

5. **Task Templates:**
   - Prompts pre-definidos
   - Variables dinámicas
   - Validation de inputs

## References

- [OpenClaw Documentation](https://github.com/openclaw)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [Fastify WebSocket Plugin](https://github.com/fastify/fastify-websocket)
- [Docker API](https://docs.docker.com/engine/api/)

---

**Version:** 1.0.0  
**Last Updated:** 2026-03-02  
**Author:** DevAlliance Team
