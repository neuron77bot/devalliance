# Agent Management API

Documentación de los endpoints CRUD para gestión de agentes en DevAlliance Mission Control.

## Base URL

```
http://localhost:3101/api
```

## Endpoints

### 1. Listar Agentes

```http
GET /agents
```

**Respuesta:**
```json
{
  "ok": true,
  "agents": [
    {
      "id": "arquitecto",
      "name": "Arquitecto",
      "role": "Architecture & Design",
      "description": "Agente especializado en arquitectura de software",
      "capabilities": ["System Design", "Architecture Planning"]
    }
  ]
}
```

### 2. Crear Agente

```http
POST /agents
```

**Body:**
```json
{
  "name": "Tester",
  "role": "Quality Assurance",
  "description": "Agente especializado en pruebas",
  "capabilities": ["Unit Testing", "Integration Testing"],
  "port": 18795  // Opcional - se auto-asigna si no se especifica
}
```

**Respuesta:**
```json
{
  "ok": true,
  "agent": {
    "id": "tester",
    "name": "Tester",
    "role": "Quality Assurance",
    "description": "Agente especializado en pruebas",
    "gateway": {
      "url": "ws://openclaw-tester:18789",
      "token": "853c8cba7fb12136cd9fa85657e2efdbbbc370fa1567a6be",
      "healthUrl": "http://openclaw-tester:18789/healthz"
    },
    "capabilities": ["Unit Testing", "Integration Testing"]
  }
}
```

**Notas:**
- El ID se genera automáticamente a partir del nombre (lowercase, con guiones)
- Se crea automáticamente un contenedor Docker para el agente
- Se genera un token de gateway aleatorio
- Se asigna el siguiente puerto disponible (a partir de 18795)

### 3. Actualizar Agente

```http
PUT /agents/:id
```

**Body (todos los campos opcionales):**
```json
{
  "name": "Tester Updated",
  "role": "Senior QA",
  "description": "Descripción actualizada",
  "capabilities": ["Unit Testing", "E2E Testing", "Performance Testing"]
}
```

**Respuesta:**
```json
{
  "ok": true,
  "agent": { /* agente actualizado */ }
}
```

**Notas:**
- Solo se actualizan los campos proporcionados
- La configuración del gateway no se modifica

### 4. Eliminar Agente

```http
DELETE /agents/:id
```

**Respuesta:**
```json
{
  "ok": true,
  "message": "Agent tester deleted successfully"
}
```

**Notas:**
- Detiene y elimina el contenedor Docker
- Elimina el directorio de configuración
- Elimina el registro de la base de datos
- Actualiza el archivo config/agents.json

### 5. Iniciar Agente

```http
POST /agents/:id/start
```

**Respuesta:**
```json
{
  "ok": true,
  "message": "Agent tester started successfully"
}
```

### 6. Detener Agente

```http
POST /agents/:id/stop
```

**Respuesta:**
```json
{
  "ok": true,
  "message": "Agent tester stopped successfully"
}
```

### 7. Reiniciar Agente

```http
POST /agents/:id/restart
```

**Respuesta:**
```json
{
  "ok": true,
  "message": "Agent tester restarted successfully"
}
```

## Validación

### Crear Agente

- `name`: String (mínimo 1 carácter) - Requerido
- `role`: String (mínimo 1 carácter) - Requerido
- `description`: String (mínimo 1 carácter) - Requerido
- `capabilities`: Array de strings - Opcional
- `port`: Number (1024-65535) - Opcional

### Actualizar Agente

- `name`: String (mínimo 1 carácter) - Opcional
- `role`: String (mínimo 1 carácter) - Opcional
- `description`: String (mínimo 1 carácter) - Opcional
- `capabilities`: Array de strings - Opcional

## Errores

### 400 Bad Request
```json
{
  "ok": false,
  "error": "Agent with ID 'tester' already exists"
}
```

### 404 Not Found
```json
{
  "ok": false,
  "error": "Agent with ID 'tester' not found"
}
```

### 500 Internal Server Error
```json
{
  "ok": false,
  "error": "Failed to create container: ..."
}
```

## Estructura de Archivos

Cuando se crea un agente, se genera la siguiente estructura:

```
/var/www/devalliance/openclaw-containers/instances/{agent-id}/
├── config.json          # Configuración del agente
├── .env                 # Variables de entorno
├── workspace/           # Workspace del agente OpenClaw
└── config/              # Configuración adicional
```

## Configuración Docker

Cada agente corre en su propio contenedor Docker con:

- Imagen: `openclaw:local`
- Network: `devalliance_network`
- Puerto mapeado: `{port}:18789`
- Volúmenes montados:
  - `workspace/` → `/root/.openclaw/workspace`
  - `config/` → `/root/.openclaw/config`
- Restart policy: `unless-stopped`

## Testing Manual

### Crear un agente de prueba
```bash
curl -X POST http://localhost:3101/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent",
    "role": "Testing",
    "description": "Agent for testing purposes",
    "capabilities": ["Testing", "Debugging"]
  }'
```

### Verificar el contenedor
```bash
docker ps | grep openclaw-test-agent
```

### Listar agentes
```bash
curl http://localhost:3101/api/agents
```

### Actualizar agente
```bash
curl -X PUT http://localhost:3101/api/agents/test-agent \
  -H "Content-Type: application/json" \
  -d '{"description": "Updated description"}'
```

### Detener agente
```bash
curl -X POST http://localhost:3101/api/agents/test-agent/stop
```

### Iniciar agente
```bash
curl -X POST http://localhost:3101/api/agents/test-agent/start
```

### Eliminar agente
```bash
curl -X DELETE http://localhost:3101/api/agents/test-agent
```

## Frontend

La interfaz de gestión de agentes está disponible en:

```
http://localhost/app/agents/manage
```

### Funcionalidades:

- ✅ Vista de grid con todos los agentes
- ✅ Crear nuevo agente (modal)
- ✅ Editar agente existente (modal)
- ✅ Eliminar agente (confirmación)
- ✅ Start/Stop/Restart contenedores
- ✅ Indicadores de estado en tiempo real
- ✅ Validación de formularios
- ✅ Notificaciones toast
- ✅ Gestión de capabilities (tags dinámicos)

### Navegación:

- **Dashboard**: `/app/`
- **Agents**: `/app/agents`
- **Manage**: `/app/agents/manage` ← Nueva página

## Próximos Pasos

- [ ] Implementar límites de recursos (CPU, memoria) por agente
- [ ] Agregar logs en tiempo real del contenedor
- [ ] Implementar métricas de uso por agente
- [ ] Agregar templates de agentes predefinidos
- [ ] Implementar backup/restore de configuraciones
