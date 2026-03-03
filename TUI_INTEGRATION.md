# TUI Integration - Terminal UI para DevAlliance

## 📋 Resumen

Implementación de Terminal UI (TUI) integrada en DevAlliance que permite chat directo con agentes OpenClaw desde el navegador usando xterm.js.

## 🎯 Características

- ✅ **Terminal emulado en navegador** usando xterm.js
- ✅ **WebSocket directo** al gateway del agente
- ✅ **Autenticación con tokens** temporales (TTL 10 minutos)
- ✅ **Botón integrado** en AgentCard (solo visible cuando agente está healthy)
- ✅ **Fallback mode**: Comando para copiar si WebSocket falla
- ✅ **Tema consistente** navy/cyan/indigo con estilo DevAlliance
- ✅ **TypeScript strict mode**

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Browser)                    │
│                                                              │
│  AgentCard ─► 💬 Button ─► TUIModal                         │
│                              │                               │
│                              ▼                               │
│                       xterm.js Terminal                      │
│                              │                               │
│                              ▼                               │
│                       WebSocket Client                       │
│                              │                               │
└──────────────────────────────┼──────────────────────────────┘
                               │
                               │ ws://127.0.0.1:PORT
                               │
┌──────────────────────────────┼──────────────────────────────┐
│                        Backend (Fastify)                     │
│                              │                               │
│  GET /api/agents/:id/tui-token                              │
│  ├─ AgentService.generateTUIToken()                         │
│  └─ Returns: { token, wsUrl, command, expiresAt }           │
│                              │                               │
└──────────────────────────────┼──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Agent Gateway (OpenClaw)                  │
│                                                              │
│  WebSocket Server @ ws://127.0.0.1:PORT                     │
│  ├─ Protocol: OpenClaw Gateway Protocol v3                  │
│  ├─ Auth: Token-based authentication                        │
│  └─ Methods: chat, sessions, health                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Implementación

### Backend

#### 1. Endpoint de TUI Token

**Archivo:** `backend/src/routes/agents.routes.ts`

```typescript
// GET /api/agents/:id/tui-token
fastify.get<{ Params: { id: string } }>(
  '/agents/:id/tui-token',
  async (request, reply) => {
    const { id } = request.params;
    const response = await agentService.generateTUIToken(id);
    return response;
  }
);
```

#### 2. Servicio de Generación de Tokens

**Archivo:** `backend/src/services/AgentService.ts`

```typescript
async generateTUIToken(id: string): Promise<TUITokenResponse> {
  const agent = await this.getAgentById(id);
  if (!agent) {
    return { ok: false, error: `Agent '${id}' not found` };
  }

  const port = agent.gateway.url.match(/:(\d+)/)[1];
  const token = agent.gateway.token;
  const wsUrl = `ws://127.0.0.1:${port}`;
  const command = `openclaw tui --url ${wsUrl} --token ${token}`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  return { ok: true, token, wsUrl, command, expiresAt };
}
```

#### 3. Schema de Respuesta

**Archivo:** `backend/src/schemas/agent.schema.ts`

```typescript
export const TUITokenResponseSchema = Type.Object({
  ok: Type.Boolean(),
  token: Type.Optional(Type.String()),
  wsUrl: Type.Optional(Type.String()),
  command: Type.Optional(Type.String()),
  expiresAt: Type.Optional(Type.String()),
  error: Type.Optional(Type.String())
});
```

### Frontend

#### 1. Componente TUIModal

**Archivo:** `frontend/src/components/AgentManagement/TUIModal.tsx`

Características principales:
- Terminal xterm.js con tema navy/cyan
- WebSocket connection al gateway
- Manejo de input/output en tiempo real
- Fallback con comando para copiar
- Loading states y error handling
- Responsive design

```typescript
export const TUIModal = ({ 
  isOpen, 
  onClose, 
  agentId, 
  agentName 
}: TUIModalProps) => {
  // Terminal initialization
  const term = new Terminal({ cursorBlink: true, ... });
  const fit = new FitAddon();
  term.loadAddon(fit);
  
  // WebSocket connection
  const ws = new WebSocket(wsUrl);
  ws.onopen = () => { /* Auth + ready */ };
  ws.onmessage = (event) => { /* Display output */ };
  
  // User input handling
  term.onData((data) => { /* Send to gateway */ });
  
  return ( /* Modal UI */ );
};
```

#### 2. Botón en AgentCard

**Archivo:** `frontend/src/components/Dashboard/AgentCard.tsx`

```typescript
{agent.status === 'healthy' && (
  <motion.button
    onClick={handleTUIClick}
    className="p-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
    title="Open Chat Terminal"
  >
    <MessageSquare className="w-4 h-4" />
  </motion.button>
)}

<TUIModal
  isOpen={showTUI}
  onClose={() => setShowTUI(false)}
  agentId={agent.id}
  agentName={agent.name}
/>
```

#### 3. Dependencias

**Archivo:** `frontend/package.json`

```json
{
  "dependencies": {
    "@xterm/xterm": "^5.5.0",
    "@xterm/addon-fit": "^0.10.0",
    "@xterm/addon-web-links": "^0.11.0"
  }
}
```

## 🧪 Testing

### 1. Test de Backend

```bash
# Test endpoint de TUI token
curl http://localhost:3100/api/agents/sol/tui-token

# Respuesta esperada:
{
  "ok": true,
  "token": "f685fceb44476a97...",
  "wsUrl": "ws://127.0.0.1:18796",
  "command": "openclaw tui --url ws://127.0.0.1:18796 --token ...",
  "expiresAt": "2026-03-03T14:49:56.016Z"
}
```

### 2. Test de Frontend

1. **Compilar frontend:**
   ```bash
   cd /var/www/devalliance/frontend
   npm run build
   ```

2. **Abrir DevAlliance en navegador:**
   - Navegar a http://localhost:3100
   - Ver AgentCard con agente "Sol"
   - Verificar botón 💬 visible (solo si status = healthy)

3. **Test de TUI:**
   - Click en botón 💬
   - Modal debe abrirse con terminal
   - Verificar conexión WebSocket
   - Escribir mensaje y presionar Enter
   - Verificar respuesta del agente en tiempo real

### 3. Test con CLI (Fallback)

Si WebSocket desde browser falla, usar comando:

```bash
openclaw tui --url ws://127.0.0.1:18796 --token f685fceb44476a97...
```

## 🔒 Seguridad

### Token TTL
- **Duración:** 10 minutos (600 segundos)
- **Implementación actual:** Usa token permanente del gateway
- **TODO:** Implementar token storage con expiration en Redis/database

### CORS y WebSocket
- **Limitación:** WebSocket desde browser puede tener restricciones CORS
- **Solución:** Fallback con comando CLI si WebSocket falla
- **Mejora futura:** Proxy WebSocket en backend si es necesario

### Autenticación
- Token JWT/gateway token requerido para todas las conexiones
- Verificación de agente ownership (futuro: multi-tenancy)

## 📚 Protocolo OpenClaw Gateway

### WebSocket Connection Flow

```
Client                                Gateway
  │                                      │
  ├─────── Connect ──────────────────────►
  │                                      │
  ◄──────── Challenge ────────────────────┤
  │         { nonce, ts }                │
  │                                      │
  ├─────── Auth Request ─────────────────►
  │         { token }                    │
  │                                      │
  ◄──────── Auth Response ───────────────┤
  │         { ok: true }                 │
  │                                      │
  ├─────── Chat Message ─────────────────►
  │         { method: "chat", ... }      │
  │                                      │
  ◄──────── Chat Reply ──────────────────┤
  │         { reply: "..." }             │
```

### Métodos Disponibles

- `auth` - Autenticación con token
- `chat` - Enviar mensaje de chat
- `sessions_list` - Listar sesiones activas
- `health` - Status del gateway
- `status_get` - Información detallada del agente

Documentación completa: `/usr/lib/node_modules/openclaw/docs/gateway/`

## 🎨 Estilo Visual

### Tema
- **Background:** navy-900 (#0f172a)
- **Foreground:** gray-200 (#e2e8f0)
- **Accent:** cyan-500 (#06b6d4)
- **Cursor:** cyan-500 con blink

### Componentes
- **Modal:** Framer Motion animations
- **Terminal:** xterm.js con fit addon
- **Button:** Lucide icons (MessageSquare)
- **Loading:** Spinner animado

## 🚀 Uso

### Para Usuarios

1. **Abrir chat con agente:**
   - Ir a Dashboard
   - Buscar agente con status "healthy"
   - Click en botón 💬 (esquina superior derecha del AgentCard)

2. **Interactuar:**
   - Escribir mensaje en terminal
   - Presionar Enter para enviar
   - Ver respuesta del agente en tiempo real
   - Ver thinking/reasoning si está habilitado

3. **Cerrar:**
   - Click en X
   - Presionar Esc
   - Click fuera del modal

### Para Desarrolladores

#### Agregar nueva funcionalidad al TUI

1. **Modificar TUIModal.tsx:**
   ```typescript
   ws.onmessage = (event) => {
     const message = JSON.parse(event.data);
     
     // Agregar manejo de nuevo tipo de mensaje
     if (message.method === 'nuevo_evento') {
       term.writeln(`\x1b[33m${message.params.text}\x1b[0m`);
     }
   };
   ```

2. **Extender backend endpoint:**
   ```typescript
   async generateTUIToken(id: string, options?: TUIOptions) {
     // Agregar opciones adicionales
     return { token, wsUrl, command, options };
   }
   ```

## 🐛 Troubleshooting

### WebSocket no conecta

**Problema:** Modal muestra "Connection failed"

**Solución:**
1. Verificar que agente esté corriendo:
   ```bash
   curl http://localhost:3100/api/agents
   ```
2. Verificar puerto gateway:
   ```bash
   netstat -tlnp | grep 18796
   ```
3. Usar comando fallback (mostrado en modal)

### Token expirado

**Problema:** Error 401 en WebSocket

**Solución:**
1. Cerrar modal
2. Reabrir para generar nuevo token
3. Token es válido por 10 minutos

### Terminal no visible

**Problema:** Modal abierto pero terminal negro/vacío

**Solución:**
1. Verificar que xterm.css esté cargado
2. Verificar console del navegador por errores
3. Verificar que terminal ref esté asignado

## 📝 TODOs

- [ ] Implementar token storage con expiration en Redis
- [ ] Agregar proxy WebSocket en backend para evitar CORS
- [ ] Implementar reconnect automático
- [ ] Agregar historial de comandos (↑/↓)
- [ ] Agregar soporte para archivos/attachments
- [ ] Agregar soporte para múltiples sesiones
- [ ] Agregar shortcuts de teclado (Ctrl+C, Ctrl+D)
- [ ] Agregar exportar conversación
- [ ] Agregar búsqueda en terminal (Ctrl+F)
- [ ] Agregar soporte para colores ANSI completos

## 📖 Referencias

- [OpenClaw Docs](https://docs.openclaw.ai)
- [OpenClaw Gateway Protocol](/usr/lib/node_modules/openclaw/docs/gateway/)
- [xterm.js Documentation](https://xtermjs.org/)
- [Fastify WebSocket](https://github.com/fastify/fastify-websocket)
- [Framer Motion](https://www.framer.com/motion/)

## 👥 Contribuir

Para contribuir a esta feature:

1. Fork el repo: `neuron77bot/devalliance`
2. Crear branch: `git checkout -b feature/tui-enhancement`
3. Commit cambios: `git commit -m 'Add: nueva funcionalidad TUI'`
4. Push: `git push origin feature/tui-enhancement`
5. Crear Pull Request

## 📄 Licencia

Parte de DevAlliance - Mission Control Platform
