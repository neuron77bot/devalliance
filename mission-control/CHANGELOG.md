# Changelog - DevAlliance Mission Control

## [1.1.0] - 2026-03-02

### Added
- **Agent Detail Modal** - Vista detallada de cada agente
  - Información completa del agente (nombre, rol, descripción, capabilities)
  - Estado de salud del gateway (healthy/unhealthy/offline)
  - Gateway status (versión, uptime, agent ID)
  - Lista de sesiones activas
  - Acciones: Refresh, Test Connection, Gateway Status
  - Cierre con tecla ESC o click fuera del modal
  
- **Backend API Improvements**
  - Endpoint `/api/agents/:id/status` ahora incluye lista de sesiones activas
  - Llamada RPC adicional a `sessions.list` para obtener sesiones del gateway
  - Mejor manejo de errores en caso de gateway offline

### Changed
- **Frontend Path Detection**
  - Auto-detección de base path desde URL actual
  - Funciona tanto en `/app` como en local
  - API_BASE se construye dinámicamente según el path

- **Styling**
  - Modal responsive con backdrop blur
  - Animación de slide-in para el modal
  - Grid layout para información del agente
  - Syntax highlighting para JSON (pre tags)

## [1.0.0] - 2026-03-02

### Initial Release
- Dashboard con vista de todos los agentes
- API REST para control de gateways
- Comunicación WebSocket con OpenClaw gateways
- Health checks automáticos
- Auto-refresh cada 10 segundos
- Docker container ready
- Nginx reverse proxy support
