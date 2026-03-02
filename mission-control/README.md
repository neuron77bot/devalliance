# DevAlliance Mission Control 🚀

Mission Control dashboard para orquestar y monitorear agentes AI de DevAlliance.

## Características

✅ **Dashboard en tiempo real** - Estado de todos los agentes  
✅ **API REST** - Control programático de gateways  
✅ **Comunicación WebSocket** - Conexión directa con OpenClaw gateways  
✅ **Monitoreo de salud** - Health checks automáticos  
✅ **Control de agentes** - Ejecutar comandos RPC en cada gateway  

## Arquitectura

```
Mission Control (puerto 3100)
    ↓
    ├─→ Arquitecto Gateway (openclaw-arquitecto:18789)
    └─→ Developer Gateway (openclaw-developer:18789)
```

## Inicio Rápido

### Opción 1: Docker (Recomendado)

```bash
cd /var/www/devalliance/mission-control
docker compose up -d
```

Dashboard: http://localhost:3100

### Opción 2: Node.js local

```bash
cd /var/www/devalliance/mission-control
npm install
npm start
```

## API Endpoints

### GET /api/agents
Lista todos los agentes configurados

```bash
curl http://localhost:3100/api/agents
```

### GET /api/status
Estado de todos los agentes

```bash
curl http://localhost:3100/api/status
```

### GET /api/agents/:id/status
Estado detallado de un agente específico

```bash
curl http://localhost:3100/api/agents/arquitecto/status
```

### POST /api/agents/:id/call
Ejecutar método RPC en un gateway

```bash
curl -X POST http://localhost:3100/api/agents/arquitecto/call \
  -H "Content-Type: application/json" \
  -d '{
    "method": "status",
    "params": {}
  }'
```

## Configuración

### Variables de Entorno

Editar `.env` para configurar la aplicación:

```env
PORT=3100
NODE_ENV=production
BASE_URL=https://devalliance.com.ar/app
BASE_PATH=/app
```

- `PORT`: Puerto donde corre el servidor
- `NODE_ENV`: Entorno (development/production)
- `BASE_URL`: URL completa de acceso público
- `BASE_PATH`: Path base cuando está detrás de un proxy (ej: /app)

### Agentes

Editar `config/agents.json` para agregar/modificar agentes:

```json
{
  "agents": [
    {
      "id": "arquitecto",
      "name": "Arquitecto",
      "role": "Architecture & Design",
      "gateway": {
        "url": "ws://openclaw-arquitecto:18789",
        "token": "...",
        "healthUrl": "http://openclaw-arquitecto:18789/healthz"
      }
    }
  ]
}
```

## Desarrollo

### Modo desarrollo (auto-reload)

```bash
npm run dev
```

### Estructura del proyecto

```
mission-control/
├── src/
│   └── server.js       # Backend Express + API
├── public/
│   ├── index.html      # Dashboard frontend
│   ├── style.css       # Estilos
│   └── app.js          # Lógica frontend
├── config/
│   └── agents.json     # Configuración de agentes
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Próximas Funcionalidades

- [ ] Logs en tiempo real de cada agente
- [ ] WebSocket bidireccional para updates live
- [ ] Asignación de tareas a agentes específicos
- [ ] Métricas y gráficos de uso
- [ ] Historial de comandos ejecutados
- [ ] Control de sesiones activas
- [ ] Interfaz de chat directo con agentes

## Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** Vanilla JS (sin frameworks)
- **Comunicación:** WebSocket (ws library)
- **Containerización:** Docker + Docker Compose
- **Network:** Docker bridge (devalliance)

## Troubleshooting

### Mission Control no puede conectar con los gateways

Verificar que los contenedores OpenClaw estén corriendo:
```bash
docker ps --filter "name=openclaw-"
```

Verificar que todos estén en la red `devalliance`:
```bash
docker network inspect devalliance
```

### Error de permisos

Asegurar que el usuario tiene permisos para leer `config/agents.json`.

---

**Creado:** 2 de marzo, 2026  
**Version:** 1.0.0  
**License:** MIT
