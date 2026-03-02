# DevAlliance Mission Control - Frontend

Frontend moderno construido con React, TypeScript, Tailwind CSS y Framer Motion para el sistema de Mission Control de DevAlliance.

## 🚀 Stack Tecnológico

- **React 18** - Framework UI
- **TypeScript** - Type safety
- **Vite** - Build tool y dev server
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **Framer Motion** - Animaciones
- **Zustand** - State management (preparado)

## 📦 Instalación

### Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

El servidor de desarrollo estará disponible en `http://localhost:5173`

### Docker

```bash
# Build de la imagen
docker build -t devalliance-frontend .

# Ejecutar con docker-compose
docker-compose up -d

# Ver logs
docker-compose logs -f
```

El contenedor estará disponible en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── Layout/          # Header, Footer, Sidebar
│   ├── Dashboard/       # AgentCard, AgentGrid, SystemOverview, StatusBadge
│   ├── AgentDetail/     # AgentDetailModal, AgentInfo, GatewayStatus
│   └── UI/              # Button, Card, Modal (componentes reutilizables)
├── pages/               # HomePage, AgentsPage, NotFoundPage
├── hooks/               # useAgents, useApi
├── types/               # Interfaces TypeScript
├── mocks/               # Datos mockeados
├── utils/               # Funciones helper
└── App.tsx             # Componente principal con routing
```

## 🎨 Diseño

### Paleta de Colores

- **Primary (Navy)**: `#4f46e5` - Acciones principales
- **Secondary (Indigo)**: `#6366f1` - Acciones secundarias
- **Accent (Purple)**: `#9333ea` - Highlights
- **Background**: `#0f0d29` (navy-950) - Fondo principal

### Componentes UI

Todos los componentes base están en `src/components/UI/`:
- `Button` - Botón con variantes y animaciones
- `Card` - Tarjeta con hover effects
- `Modal` - Modal con backdrop blur y animaciones

## 📊 Datos Mock

Actualmente el frontend usa datos mockeados en `src/mocks/agents.ts`:

- 5 agentes con diferentes estados (healthy, warning, offline)
- Métricas de uptime, tareas completadas, tiempo de respuesta
- Gateway URLs y puertos

## 🔌 Integración con API Real

El frontend está **preparado** para integración con el backend pero actualmente usa datos mock.

### Cómo cambiar de Mock a API Real

1. **Crear archivo `.env`** basado en `.env.example`:
```bash
cp .env.example .env
```

2. **Configurar la URL del backend**:
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

3. **Descomentar código de API en `src/hooks/useAgents.ts`**:
```typescript
// ANTES (mock):
await new Promise(resolve => setTimeout(resolve, 500));
setAgents(mockAgents);

// DESPUÉS (API real):
const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/agents`);
const data = await response.json();
setAgents(data);
```

4. **El hook `useApi.ts` ya está listo** para hacer llamadas fetch genéricas.

### Endpoints esperados del Backend

```
GET  /api/agents           - Lista de agentes
GET  /api/agents/:id       - Detalle de agente
GET  /api/system/status    - Status del sistema
GET  /api/tasks            - Lista de tareas
POST /api/agents/:id/task  - Crear tarea para un agente
```

## 🎭 Animaciones

Framer Motion se usa para:
- Transiciones de página
- Hover effects en cards
- Animaciones de modal (slide-in/fade)
- Loading states
- Pulsación en status badges
- Micro-interactions en botones

## 📱 Responsive Design

El diseño es **mobile-first** y se adapta a todos los tamaños:

- Mobile: Grid de 1 columna
- Tablet: Grid de 2 columnas
- Desktop: Grid de 3 columnas
- Modal: Fullscreen en mobile, centered en desktop

## 🧪 Testing (TODO)

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e
```

## 🚢 Deployment

### Variables de Entorno

En producción, configurar:
```env
VITE_API_BASE_URL=https://api.devalliance.com/api
VITE_ENV=production
```

### Build

```bash
npm run build
# Output en /dist
```

### Docker Production

```bash
docker build -t devalliance-frontend:latest .
docker push devalliance-frontend:latest
```

## 📝 Notas Importantes

- ⚠️ **Datos Mock**: Actualmente NO conecta a API real
- ✅ **Preparado**: Toda la integración está lista, solo descomentar
- 🎨 **Tema**: Mantiene el color scheme navy/indigo del diseño original
- 🔐 **Environment vars**: Usar `.env.local` para desarrollo (no commitear)

## 🐛 Troubleshooting

### El servidor de desarrollo no inicia
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Build falla
Verificar que todas las dependencias estén instaladas:
```bash
npm ci
```

### Tailwind no funciona
Asegurarse de que `tailwind.config.js` y `postcss.config.js` existan en la raíz.

## 📚 Documentación

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [React Router](https://reactrouter.com/)

## 🤝 Contribuir

Ver issue #6: https://github.com/neuron77bot/devalliance/issues/6

---

**DevAlliance Mission Control** - Powered by AI Agents 🚀
