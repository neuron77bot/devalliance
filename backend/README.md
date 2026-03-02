# DevAlliance Mission Control Backend v2

Backend API para DevAlliance Mission Control - Sistema de orquestación multi-agente con Fastify, TypeScript, MongoDB y Swagger.

## 🚀 Stack Tecnológico

- **Framework**: Fastify 5.x
- **Language**: TypeScript 5.x
- **Database**: MongoDB 7.x (Mongoose)
- **Validation**: TypeBox
- **Documentation**: Swagger/OpenAPI
- **WebSocket**: @fastify/websocket
- **Logger**: Pino

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── routes/          # Rutas de la API
│   │   ├── agents.routes.ts
│   │   ├── tasks.routes.ts
│   │   ├── status.routes.ts
│   │   └── health.routes.ts
│   ├── services/        # Lógica de negocio
│   │   ├── AgentService.ts
│   │   ├── TaskService.ts
│   │   └── GatewayService.ts
│   ├── models/          # Modelos Mongoose
│   │   ├── Agent.model.ts
│   │   ├── Task.model.ts
│   │   └── Team.model.ts
│   ├── schemas/         # Schemas TypeBox para validación
│   │   ├── agent.schema.ts
│   │   └── common.schema.ts
│   ├── plugins/         # Plugins Fastify
│   │   ├── database.ts
│   │   └── websocket.ts
│   └── server.ts        # Entrada principal
├── config/
│   └── agents.json      # Configuración de agentes
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## 🔧 Instalación

### Desarrollo Local

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Asegurarse que MongoDB está corriendo
# docker run -d -p 27017:27017 mongo:7

# Iniciar en modo desarrollo (con hot-reload)
npm run dev
```

### Con Docker

```bash
# Build y start con docker-compose
docker-compose up -d

# Ver logs
docker-compose logs -f backend

# Detener
docker-compose down
```

## 📡 API Endpoints

### Health & Config
- `GET /health` - Health check del servicio
- `GET /config` - Configuración del frontend

### Agents
- `GET /api/agents` - Listar todos los agentes
- `GET /api/agents/:id/status` - Obtener estado de un agente (health + gateway info)
- `POST /api/agents/:id/call` - Llamar método RPC del gateway

### Tasks
- `GET /api/tasks` - Listar todas las tareas
- `POST /api/tasks` - Crear nueva tarea
- `GET /api/tasks/:id` - Obtener tarea por ID
- `PATCH /api/tasks/:id` - Actualizar tarea
- `DELETE /api/tasks/:id` - Eliminar tarea

### Status
- `GET /api/status` - Estado de salud de todos los agentes

## 📚 Swagger UI

La documentación interactiva de la API está disponible en:

```
http://localhost:3100/docs
```

Incluye:
- Todos los endpoints documentados
- Schemas de request/response
- Prueba interactiva de endpoints
- Ejemplos de uso

## 🔌 Gateway RPC

El servicio se comunica con agentes OpenClaw a través de WebSocket RPC:

```typescript
// Ejemplo de llamada RPC
POST /api/agents/developer/call
{
  "method": "sessions.list",
  "params": { "limit": 10 }
}
```

## 🗄️ Base de Datos

### Modelos

**Agent**
- id, name, role, description
- gateway { url, token, healthUrl }
- capabilities[]

**Task**
- title, description
- assignedTo (agentId)
- status (pending, in-progress, completed, failed)
- priority (low, medium, high, critical)
- result, error

**Team**
- name, description
- agentIds[]

### Migración desde config/agents.json

Al iniciar, el servidor automáticamente:
1. Lee `config/agents.json`
2. Crea/actualiza los agentes en MongoDB
3. Los agentes están disponibles vía API

## 🧪 Testing

```bash
# Ejecutar tests (pending)
npm test

# Health check manual
curl http://localhost:3100/health

# Listar agentes
curl http://localhost:3100/api/agents

# Check status de un agente
curl http://localhost:3100/api/agents/developer/status
```

## 🌍 Variables de Entorno

```bash
NODE_ENV=development          # development | production
PORT=3100                     # Puerto del servidor
HOST=0.0.0.0                  # Host bind
MONGODB_URI=mongodb://...     # URI de MongoDB
BASE_URL=                     # URL base para frontend
BASE_PATH=                    # Path base para frontend
```

## 🔐 Seguridad

- CORS habilitado (configurable)
- Validación de schemas con TypeBox
- Error handling centralizado
- Logs estructurados con Pino
- Health checks integrados

## 📦 Build para Producción

```bash
# Build TypeScript
npm run build

# Ejecutar build
npm start
```

## 🐳 Docker Build

```bash
# Build imagen
docker build -t devalliance-backend:v2 .

# Run container
docker run -d \
  -p 3100:3100 \
  -e MONGODB_URI=mongodb://host:27017/devalliance \
  devalliance-backend:v2
```

## 🔄 Migración desde v1

Este backend v2 reemplaza al backend Express v1 con:

✅ TypeScript completo  
✅ Fastify (más rápido que Express)  
✅ Swagger UI auto-generado  
✅ MongoDB + Mongoose (reemplaza config estático)  
✅ Service layer pattern  
✅ Schema validation con TypeBox  
✅ WebSocket support nativo  
✅ Mejor error handling  
✅ Logs estructurados  

## 🤝 Contribución

1. Backend v1: `/var/www/devalliance/mission-control/src/server.js`
2. Issue GitHub: https://github.com/neuron77bot/devalliance/issues/10
3. Migración completa a v2 con mejoras arquitectónicas

## 📄 Licencia

MIT
