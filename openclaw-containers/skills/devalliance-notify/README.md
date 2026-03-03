# DevAlliance Notify Skill

Skill para notificaciones de tareas desde agentes OpenClaw al grupo Telegram de DevAlliance.

## Descripción

Este skill permite a los agentes OpenClaw notificar cambios de estado de tareas directamente al grupo DevAlliance en Telegram. Funciona como puente entre la ejecución de tareas por agentes y el sistema de notificaciones del backend.

## Arquitectura

```
Agente OpenClaw (contenedor)
    ↓ ejecuta
notify-task.sh
    ↓ HTTP POST
Backend DevAlliance (localhost:3101)
    ↓ message tool
Telegram (grupo DevAlliance)
```

## Archivos

- **SKILL.md**: Documentación que lee el agente OpenClaw al usar el skill
- **notify-task.sh**: Script bash que envía la notificación via backend API
- **README.md**: Este archivo (documentación para desarrolladores)

## Instalación

### 1. Montar skill en contenedores

Agregar volumen en `docker-compose.yml` de cada agente:

```yaml
volumes:
  - /var/www/devalliance/openclaw-containers/skills:/home/node/.openclaw/workspace/skills:ro
```

### 2. Configurar backend endpoint

Crear endpoint en backend: `POST /api/notifications/task`

```typescript
// backend/src/routes/notifications.routes.ts
app.post('/notifications/task', async (req, res) => {
  const { taskId, status, message } = req.body;
  
  // Enviar mensaje a Telegram usando message tool o servicio
  await telegramService.sendToDevAlliance({
    taskId,
    status,
    message
  });
  
  return res.send({ success: true });
});
```

### 3. Configurar OpenClaw skillsPaths

En `config.json` de cada agente:

```json
{
  "skillsPaths": [
    "/home/node/.openclaw/workspace/skills"
  ]
}
```

## Uso desde Agente

El agente lee `SKILL.md` cuando se le pide usar el skill, y ejecuta:

```bash
./skills/devalliance-notify/notify-task.sh <task_id> <status> "<message>"
```

## Formato de Notificaciones

Las notificaciones incluyen:
- ✅/❌/⏳ Emoji según estado
- Task ID (clickable en futuras versiones)
- Status actual
- Mensaje descriptivo
- Timestamp automático

## Estados Soportados

- `completed` → ✅
- `failed` → ❌
- `in_progress` → ⏳
- `assigned` → 📋
- `cancelled` → 🚫
- `pending` → ⏸️

## Testing

```bash
# Test manual desde host
/var/www/devalliance/openclaw-containers/skills/devalliance-notify/notify-task.sh \
  507f1f77bcf86cd799439011 \
  completed \
  "Test notification"

# Test desde contenedor agente
docker exec openclaw-mati \
  /home/node/.openclaw/workspace/skills/devalliance-notify/notify-task.sh \
  507f1f77bcf86cd799439011 \
  completed \
  "Test from container"
```

## Próximas Mejoras

- [ ] Deep links a task detail en Mission Control
- [ ] Soporte para attachments (screenshots, logs)
- [ ] Rate limiting para evitar spam
- [ ] Queue de notificaciones para retry automático
- [ ] Notificaciones por prioridad (high → mention users)

## Dependencias

- curl (disponible en imagen openclaw:local)
- Backend DevAlliance corriendo en localhost:3101
- Network mode: host (para acceder a localhost desde contenedor)

---

**Autor:** DevAlliance Team  
**Versión:** 1.0.0  
**Última actualización:** 2 Mar 2026
