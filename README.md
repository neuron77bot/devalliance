# DevAlliance Mission Control - Enhanced Dashboard

Sistema de orquestación multi-agente con dashboard en tiempo real para monitoreo y gestión de agentes de desarrollo.

## 🚀 Features

### 💬 Terminal UI (TUI) Integration (✅ Completado)

- **Terminal Emulado en Navegador:**
  - xterm.js con tema navy/cyan consistente
  - WebSocket directo al gateway del agente
  - Autenticación con tokens temporales (TTL 10 min)
  - Botón 💬 integrado en AgentCard

- **Chat en Tiempo Real:**
  - Interacción bidireccional con agentes OpenClaw
  - Thinking/reasoning visible en tiempo real
  - Manejo de ANSI colors y escape sequences
  - Input buffer con backspace support

- **Fallback Mode:**
  - Comando CLI para copiar si WebSocket falla
  - Indicador de expiración de token
  - Error handling robusto

- **Seguridad:**
  - Tokens con TTL de 10 minutos
  - Autenticación via gateway token
  - Endpoint dedicado: `GET /api/agents/:id/tui-token`

📖 **Documentación completa:** [TUI_INTEGRATION.md](./TUI_INTEGRATION.md)

### Issue #7 - Enhanced Dashboard (✅ Completado)

- **📊 KPIs en Tiempo Real:**
  - Total de agentes
  - Agentes activos
  - Tareas completadas hoy
  - Tiempo de respuesta promedio

- **📈 Gráficos y Visualizaciones:**
  - Response Time Over Time (gráfico de línea)
  - Agent Status Distribution (gráfico circular)
  - Tasks by Agent (gráfico de barras)
  - Sparklines individuales por agente (CPU, Memory, Response Time)

- **📋 Activity Timeline:**
  - Feed de actividad en tiempo real
  - Eventos: agent started/stopped, task created/completed, errors
  - Formato de tiempo relativo
  - Auto-actualización cada 10 segundos

- **🔴 Real-Time Updates:**
  - WebSocket para actualizaciones en tiempo real
  - Polling fallback si WebSocket no disponible
  - Indicador visual de conexión "Live Updates"
  - Actualización de métricas cada 5 segundos

- **🎯 Performance Metrics por Agente:**
  - Sección expandible en cada agent card
  - Gráficos históricos de CPU, Memory y Response Time
  - Stats de tareas completadas y fallidas
  - Última actividad registrada

## 🏗️ Arquitectura

```
/var/www/devalliance/
├── backend/              # Fastify + TypeScript + MongoDB
│   ├── src/
│   │   ├── models/
│   │   │   ├── Activity.model.ts      # ✨ Nuevo
│   │   │   ├── Task.model.ts
│   │   │   └── Agent.model.ts
│   │   ├── services/
│   │   │   ├── MetricsService.ts      # ✨ Nuevo
│   │   │   ├── TaskService.ts
│   │   │   └── AgentService.ts
│   │   ├── routes/
│   │   │   ├── metrics.routes.ts      # ✨ Nuevo
│   │   │   ├── activity.routes.ts     # ✨ Nuevo
│   │   │   ├── tasks.routes.ts
│   │   │   └── agents.routes.ts
│   │   └── plugins/
│   │       └── websocket.ts           # ✨ Actualizado
│   └── docker-compose.yml
│
└── frontend/             # React + TypeScript + Tailwind
    ├── src/
    │   ├── components/
    │   │   ├── AgentManagement/
    │   │   │   ├── TUIModal.tsx             # ✨ Nuevo (Terminal UI)
    │   │   │   ├── ChatModal.tsx
    │   │   │   ├── CreateEditModal.tsx
    │   │   │   └── DeleteConfirmModal.tsx
    │   │   └── Dashboard/
    │   │       ├── KPICard.tsx              # ✨ Nuevo
    │   │       ├── MetricsChart.tsx         # ✨ Nuevo
    │   │       ├── ActivityTimeline.tsx     # ✨ Nuevo
    │   │       ├── AgentMetrics.tsx         # ✨ Nuevo
    │   │       ├── LiveIndicator.tsx        # ✨ Nuevo
    │   │       ├── AgentCard.tsx            # 🔄 Actualizado (+ TUI button)
    │   │       └── AgentGrid.tsx            # 🔄 Actualizado
    │   ├── hooks/
    │   │   ├── useMetrics.ts                # ✨ Nuevo
    │   │   ├── useTasks.ts                  # ✨ Nuevo
    │   │   ├── useWebSocket.ts              # ✨ Nuevo
    │   │   ├── useActivity.ts               # ✨ Nuevo
    │   │   └── useAgents.ts
    │   └── pages/
    │       └── HomePage.tsx                 # 🔄 Actualizado
    └── docker-compose.yml
```

## 🔌 API Endpoints

### Métricas (Nuevo)

#### `GET /api/metrics/system`
Métricas globales del sistema.

**Response:**
```json
{
  "totalAgents": 2,
  "activeAgents": 2,
  "inactiveAgents": 0,
  "totalTasks": 15,
  "tasksCompletedToday": 5,
  "tasksPending": 3,
  "tasksInProgress": 2,
  "tasksFailed": 0,
  "avgResponseTime": 245,
  "timestamp": "2026-03-02T18:00:00.000Z"
}
```

#### `GET /api/metrics/agents`
Métricas de todos los agentes.

**Response:**
```json
[
  {
    "agentId": "arquitecto",
    "agentName": "Arquitecto",
    "status": "online",
    "cpu": 45,
    "memory": 256,
    "uptime": 86400000,
    "avgResponseTime": 180,
    "tasksCompleted": 12,
    "tasksFailed": 1,
    "lastActivity": "2026-03-02T17:55:00.000Z",
    "history": [
      {
        "timestamp": "2026-03-02T17:50:00.000Z",
        "cpu": 42,
        "memory": 250,
        "responseTime": 175
      }
    ]
  }
]
```

#### `GET /api/metrics/agents/:id`
Métricas de un agente específico con historial completo.

#### `GET /api/metrics/response-time`
Historial de response time (últimos 60 minutos).

### TUI Token (Nuevo)

#### `GET /api/agents/:id/tui-token`
Generar token temporal para acceso TUI WebSocket.

**Response:**
```json
{
  "ok": true,
  "token": "f685fceb44476a97c3ca193b6986f01fdf05aed83b8eff0e",
  "wsUrl": "ws://127.0.0.1:18796",
  "command": "openclaw tui --url ws://127.0.0.1:18796 --token ...",
  "expiresAt": "2026-03-03T14:49:56.016Z"
}
```

**Security:**
- Token válido por 10 minutos
- Requiere agente en estado "healthy"
- WebSocket directo al gateway del agente

### Activity Feed (Nuevo)

#### `GET /api/activity`
Stream de actividad reciente.

**Query params:**
- `limit` (default: 100, max: 200)
- `type` (filter por tipo de evento)
- `agentId` (filter por agente)

**Response:**
```json
[
  {
    "_id": "...",
    "type": "task_completed",
    "agentId": "arquitecto",
    "taskId": "...",
    "message": "Task completed successfully",
    "level": "success",
    "timestamp": "2026-03-02T18:00:00.000Z",
    "metadata": {}
  }
]
```

**Activity Types:**
- `agent_started`
- `agent_stopped`
- `agent_error`
- `task_created`
- `task_started`
- `task_completed`
- `task_failed`
- `system_event`

#### `POST /api/activity`
Crear evento de actividad (uso interno).

#### `GET /api/activity/stats`
Estadísticas de actividad.

### WebSocket

#### `ws://localhost:3101/ws`
Conexión WebSocket para updates en tiempo real.

**Messages:**
```json
{
  "type": "metrics_update",
  "data": {
    "system": { ... },
    "agents": [ ... ]
  },
  "timestamp": "2026-03-02T18:00:00.000Z"
}
```

**Keep-alive:**
```json
// Client -> Server
{ "type": "ping" }

// Server -> Client
{ "type": "pong" }
```

## 🚀 Deployment

### Backend
```bash
cd /var/www/devalliance/backend
docker compose up -d --build
```

Endpoints:
- API: http://localhost:3101/api
- Swagger: http://localhost:3101/docs
- Health: http://localhost:3101/health
- WebSocket: ws://localhost:3101/ws

### Frontend
```bash
cd /var/www/devalliance/frontend
npm install  # Incluye xterm.js, recharts, etc.
npm run build
docker compose up -d --build
```

**Dependencies:**
- `@xterm/xterm` - Terminal emulator
- `@xterm/addon-fit` - Auto-resize addon
- `@xterm/addon-web-links` - Clickable links
- `recharts` - Charts library
- `framer-motion` - Animations
- `lucide-react` - Icons

URL: http://localhost:3000

## 🧪 Testing

### Backend
```bash
# Health check
curl http://localhost:3101/health

# System metrics
curl http://localhost:3101/api/metrics/system

# Activity feed
curl http://localhost:3101/api/activity?limit=10

# Agent metrics
curl http://localhost:3101/api/metrics/agents
```

### Frontend
1. Abrir http://localhost:3000
2. Verificar que los KPIs cargan correctamente
3. Verificar que los gráficos muestran datos
4. Verificar que el Activity Timeline se actualiza
5. Verificar el indicador "Live Updates" (verde = conectado)
6. Expandir métricas de un agente
7. Verificar sparklines de CPU/Memory/Response Time
8. **TUI Testing:**
   - Click en botón 💬 en AgentCard (solo visible si agente healthy)
   - Verificar que modal TUI abre con terminal
   - Escribir mensaje y presionar Enter
   - Verificar respuesta del agente en tiempo real
   - Verificar que thinking/reasoning aparece si está habilitado

### WebSocket
```javascript
const ws = new WebSocket('ws://localhost:3101/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

// Enviar ping
ws.send(JSON.stringify({ type: 'ping' }));
```

## 📊 Performance

- Dashboard debe cargar en <2s
- Métricas se actualizan cada 5 segundos via WebSocket
- Activity feed se actualiza cada 10 segundos (polling fallback)
- Response time history mantiene últimos 60 minutos
- Activity events se eliminan automáticamente después de 30 días (TTL index)

## 🎨 Design System

- **Tailwind CSS** para estilos
- **Framer Motion** para animaciones
- **Recharts** para gráficos
- **Lucide React** para iconos
- **Color scheme:** Navy/Cyan/Indigo
- **Responsive:** Mobile-first design

## 🔐 Security

- CORS habilitado
- WebSocket con reconexión automática
- Rate limiting en endpoints (configurar si necesario)
- MongoDB con TTL para cleanup automático

## 📝 Notas

### Datos Mock
Actualmente el sistema genera métricas mock realistas:
- CPU: 10-80%
- Memory: 100-500 MB
- Response time: 50-500ms
- Tasks: generadas automáticamente al inicio

Para integrar con OpenClaw real, modificar `MetricsService.ts` para obtener datos reales.

### WebSocket Fallback
Si WebSocket falla, el sistema automáticamente usa polling HTTP cada 5 segundos.

### Configuración
Backend: `/var/www/devalliance/backend/.env`
```env
PORT=3101
HOST=0.0.0.0
MONGODB_URI=mongodb://localhost:27017/devalliance
NODE_ENV=development
```

Frontend: `/var/www/devalliance/frontend/.env`
```env
VITE_API_BASE_URL=/app/api
```

## 🐛 Troubleshooting

### WebSocket no conecta
- Verificar que el backend esté corriendo
- Verificar firewall/proxy no bloquea conexiones WS
- Check browser console para errores

### Gráficos no muestran datos
- Verificar que hay agentes en el sistema
- Verificar que MetricsService está generando datos
- Check browser console para errores de API

### Frontend no carga
- Verificar que `npm run build` completó exitosamente
- Verificar que nginx está sirviendo archivos estáticos
- Check `/var/www/devalliance/frontend/dist/` existe

## 👥 Contributors

- DevAlliance Team
- Built with ❤️ using OpenClaw

## 📄 License

MIT
