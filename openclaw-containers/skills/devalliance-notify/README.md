# DevAlliance Notify Skill

Skill para notificaciones de progreso de tareas desde agentes OpenClaw al backend DevAlliance.

## Descripción

Este skill permite a los agentes OpenClaw notificar automáticamente el progreso de ejecución de tareas al backend DevAlliance. El backend procesa estos callbacks y actualiza el estado de la tarea en tiempo real.

## Arquitectura

```
Agente OpenClaw (contenedor)
    ↓ ejecuta tarea
Read SKILL.md (instrucciones)
    ↓ 
notify-task.sh started
    ↓ HTTP POST
Backend DevAlliance (localhost:3101)
    ↓ actualiza MongoDB
Mission Control Dashboard (real-time update via WebSocket)
```

## Archivos

- **SKILL.md**: Documentación que lee el agente OpenClaw al usar el skill
- **notify-task.sh**: Script bash que envía callbacks al backend
- **README.md**: Este archivo (documentación para desarrolladores)

## Estados de Tarea

El skill soporta 3 estados de callback:

| Status | Cuándo usar | Campos requeridos |
|--------|-------------|-------------------|
| `started` | Al iniciar ejecución de tarea | taskId, status |
| `completed` | Cuando la tarea termina exitosamente | taskId, status, result |
| `failed` | Cuando la tarea falla con error | taskId, status, error |

## API

### Endpoint

```
POST /api/tasks/:taskId/callback
```

### Headers

```
Content-Type: application/json
x-agent-token: <OPENCLAW_AGENT_ID>
```

### Request Body

```json
{
  "status": "started|completed|failed",
  "result": "Descripción opcional del resultado (para completed)",
  "error": "Mensaje de error opcional (para failed)",
  "timestamp": "2026-03-02T21:30:00-03:00"
}
```

### Response

```json
{
  "success": true,
  "taskId": "507f1f77bcf86cd799439011",
  "newStatus": "in_progress"
}
```

## Instalación

### 1. Montar skill en contenedores

En `DockerService.ts`, agregar volumen al crear contenedores:

```typescript
volumes: [
  // ... otros volúmenes
  '/var/www/devalliance/openclaw-containers/skills:/home/node/.openclaw/workspace/skills:ro'
]
```

O manualmente en `docker-compose.yml`:

```yaml
volumes:
  - /var/www/devalliance/openclaw-containers/skills:/home/node/.openclaw/workspace/skills:ro
```

### 2. Configurar skillsPaths en agentes

En `config.json` de cada agente:

```json
{
  "skillsPaths": [
    "/home/node/.openclaw/workspace/skills"
  ]
}
```

### 3. Configurar variables de entorno

En `.env` o `docker-compose.yml` del agente:

```yaml
environment:
  - DEVALLIANCE_BACKEND_URL=http://localhost:3101
  - OPENCLAW_AGENT_ID=${AGENT_ID}
```

### 4. Implementar endpoint en backend

Crear ruta en `backend/src/routes/tasks.routes.ts`:

```typescript
app.post('/tasks/:id/callback', async (req, res) => {
  const { id } = req.params;
  const { status, result, error } = req.body;
  const agentToken = req.headers['x-agent-token'];
  
  // Validar token
  if (!agentToken) {
    return res.status(401).send({ error: 'Missing agent token' });
  }
  
  // Procesar callback
  const task = await taskService.handleCallback(id, {
    status,
    result,
    error,
    agentId: agentToken
  });
  
  return res.send({ success: true, taskId: id, newStatus: task.status });
});
```

## Uso desde Agente

### Workflow típico

Cuando el agente recibe un prompt de tarea:

```
TASK EXECUTION REQUEST

Task ID: 507f1f77bcf86cd799439011
Title: Deploy backend to production
Description: ...
```

El agente debe:

1. **Leer el skill**:
   ```bash
   read /home/node/.openclaw/workspace/skills/devalliance-notify/SKILL.md
   ```

2. **Notificar inicio**:
   ```bash
   exec ./skills/devalliance-notify/notify-task.sh 507f1f77bcf86cd799439011 started
   ```

3. **Ejecutar la tarea** (usar tools apropiados)

4. **Notificar resultado**:
   - Éxito:
     ```bash
     exec ./skills/devalliance-notify/notify-task.sh \
       507f1f77bcf86cd799439011 \
       completed \
       "Backend deployed successfully to production"
     ```
   - Error:
     ```bash
     exec ./skills/devalliance-notify/notify-task.sh \
       507f1f77bcf86cd799439011 \
       failed \
       "" \
       "Docker build failed: connection timeout"
     ```

## Testing

### Test manual desde host

```bash
# Test callback started
/var/www/devalliance/openclaw-containers/skills/devalliance-notify/notify-task.sh \
  507f1f77bcf86cd799439011 \
  started

# Test callback completed
/var/www/devalliance/openclaw-containers/skills/devalliance-notify/notify-task.sh \
  507f1f77bcf86cd799439011 \
  completed \
  "Task completed successfully"

# Test callback failed
/var/www/devalliance/openclaw-containers/skills/devalliance-notify/notify-task.sh \
  507f1f77bcf86cd799439011 \
  failed \
  "" \
  "Something went wrong"
```

### Test desde contenedor

```bash
# Verificar montaje del skill
docker exec openclaw-mati ls -la /home/node/.openclaw/workspace/skills/devalliance-notify/

# Ejecutar desde contenedor
docker exec openclaw-mati \
  /home/node/.openclaw/workspace/skills/devalliance-notify/notify-task.sh \
  507f1f77bcf86cd799439011 \
  started
```

### Verificar logs

```bash
# Backend logs
docker logs devalliance-backend -f

# Agent logs
docker logs openclaw-mati -f
```

## Transiciones de Estado

El backend debe manejar estas transiciones:

```
assigned → in_progress (callback: started)
in_progress → completed (callback: completed)
in_progress → failed (callback: failed)
```

## Seguridad

- **Read-only mount**: El skill se monta como `:ro` para prevenir modificaciones
- **Token authentication**: Header `x-agent-token` valida que el callback viene del agente correcto
- **Network isolation**: Agentes usan network mode `host`, solo pueden acceder a localhost

## Variables de Entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `DEVALLIANCE_BACKEND_URL` | `http://localhost:3101` | URL del backend DevAlliance |
| `OPENCLAW_AGENT_ID` | Auto-set | ID del agente (usado como token) |

## Próximas Mejoras

- [ ] Retry automático en caso de error de red
- [ ] Queue de callbacks para batch processing
- [ ] Progress percentages (0-100%)
- [ ] Streaming de logs en tiempo real
- [ ] Attachments (screenshots, archivos generados)
- [ ] Webhook notifications a Telegram/Discord

## Troubleshooting

### El agente no encuentra el skill

```bash
# Verificar montaje
docker exec <agent-container> ls /home/node/.openclaw/workspace/skills/

# Verificar skillsPaths en config
docker exec <agent-container> cat /home/node/.openclaw/config.json
```

### Error 401 en callback

Verificar que `OPENCLAW_AGENT_ID` esté configurado:

```bash
docker exec <agent-container> env | grep OPENCLAW_AGENT_ID
```

### Backend no recibe callbacks

```bash
# Verificar que backend escucha en puerto correcto
curl http://localhost:3101/api/health

# Verificar network mode del agente
docker inspect <agent-container> | grep NetworkMode
```

## Dependencias

- **curl**: Disponible en imagen `openclaw:local`
- **jq**: Para formatear JSON (opcional)
- **Backend DevAlliance**: Corriendo en localhost:3101
- **Network mode**: `host` (para acceder a localhost desde contenedor)

---

**Autor:** DevAlliance Team  
**Versión:** 2.0.0  
**Última actualización:** 2 Mar 2026
