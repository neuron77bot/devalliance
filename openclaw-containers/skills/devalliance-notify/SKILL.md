# DevAlliance Notify Skill

Notifica cambios de estado de tareas a través de Telegram.

## Uso

Cuando completes una tarea o necesites notificar un evento importante:

```bash
./skills/devalliance-notify/notify-task.sh <task_id> <status> "<message>"
```

## Parámetros

- `task_id`: ID de la tarea (MongoDB ObjectId)
- `status`: Estado de la tarea (completed, failed, in_progress, etc.)
- `message`: Mensaje descriptivo del resultado

## Ejemplos

```bash
# Tarea completada exitosamente
./skills/devalliance-notify/notify-task.sh 507f1f77bcf86cd799439011 completed "Backend deployado exitosamente"

# Tarea fallida
./skills/devalliance-notify/notify-task.sh 507f1f77bcf86cd799439011 failed "Error al conectar con MongoDB"

# Progreso de tarea
./skills/devalliance-notify/notify-task.sh 507f1f77bcf86cd799439011 in_progress "Tests pasando (80%)"
```

## Output

El script retorna:
- **Exit code 0**: Notificación enviada exitosamente
- **Exit code 1**: Error al enviar notificación

## Notas

- Las notificaciones se envían al grupo DevAlliance en Telegram
- El mensaje se formatea automáticamente con emojis según el estado
- El script incluye timestamp automático
