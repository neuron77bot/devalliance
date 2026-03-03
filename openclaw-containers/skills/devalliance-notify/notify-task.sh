#!/bin/bash
# DevAlliance Task Notification Script
# Notifica al backend sobre el estado de una tarea

set -e

BACKEND_URL="${DEVALLIANCE_BACKEND_URL:-http://localhost:3101}"
TASK_ID="$1"
STATUS="$2"  # started | completed | failed
RESULT="${3:-}"  # Opcional: descripción del resultado
ERROR="${4:-}"  # Opcional: mensaje de error

if [ -z "$TASK_ID" ] || [ -z "$STATUS" ]; then
  echo "Usage: notify-task.sh <taskId> <status> [result] [error]"
  echo "Status: started | completed | failed"
  exit 1
fi

# Obtener agent token del env
AGENT_TOKEN="${OPENCLAW_AGENT_ID}"

# Construir payload JSON
PAYLOAD=$(cat <<EOF
{
  "status": "$STATUS",
  "result": $([ -n "$RESULT" ] && echo "\"$RESULT\"" || echo "null"),
  "error": $([ -n "$ERROR" ] && echo "\"$ERROR\"" || echo "null"),
  "timestamp": "$(date -Iseconds)"
}
EOF
)

# Enviar POST al backend
curl -s -X POST \
  "${BACKEND_URL}/api/tasks/${TASK_ID}/callback" \
  -H "Content-Type: application/json" \
  -H "x-agent-token: ${AGENT_TOKEN}" \
  -d "$PAYLOAD"

echo "✅ Notificación enviada: Task $TASK_ID → $STATUS"
