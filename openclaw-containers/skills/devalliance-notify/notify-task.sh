#!/bin/bash
set -euo pipefail

# DevAlliance Task Notification Script
# Envía notificaciones de tareas al grupo Telegram de DevAlliance

TASK_ID="${1:-}"
STATUS="${2:-}"
MESSAGE="${3:-}"

# Validar parámetros
if [[ -z "$TASK_ID" ]] || [[ -z "$STATUS" ]] || [[ -z "$MESSAGE" ]]; then
  echo "Error: Missing required parameters"
  echo "Usage: $0 <task_id> <status> <message>"
  exit 1
fi

# Emojis por estado
declare -A STATUS_EMOJIS=(
  ["completed"]="✅"
  ["failed"]="❌"
  ["in_progress"]="⏳"
  ["assigned"]="📋"
  ["cancelled"]="🚫"
  ["pending"]="⏸️"
)

EMOJI="${STATUS_EMOJIS[$STATUS]:-📢}"

# Formatear mensaje
FORMATTED_MESSAGE="$EMOJI **Task Update**

**Task ID:** \`$TASK_ID\`
**Status:** $STATUS
**Message:** $MESSAGE

_$(date '+%Y-%m-%d %H:%M:%S')_"

# Backend API endpoint (desde contenedor, usa host network)
BACKEND_URL="http://localhost:3101/api/notifications/task"

# Enviar notificación via backend API
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"taskId\": \"$TASK_ID\",
    \"status\": \"$STATUS\",
    \"message\": \"$MESSAGE\"
  }" || echo "000")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "201" ]]; then
  echo "✓ Notification sent successfully"
  exit 0
else
  echo "✗ Failed to send notification (HTTP $HTTP_CODE)"
  echo "$BODY"
  exit 1
fi
