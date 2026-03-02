import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import databasePlugin from './plugins/database';
import websocketPlugin from './plugins/websocket';
import agentRoutes from './routes/agents.routes';
import statusRoutes from './routes/status.routes';
import healthRoutes from './routes/health.routes';
import taskRoutes from './routes/tasks.routes';
import metricsRoutes from './routes/metrics.routes';
import activityRoutes from './routes/activity.routes';
import { TaskService } from './services/TaskService';
import { OpenClawGatewayService } from './services/OpenClawGatewayService';
import { StatusSyncService } from './services/StatusSyncService';
import { DockerService } from './services/DockerService';
import gatewayRoutes from './routes/gateway.routes';
import { seedActivities } from './utils/seedActivities';

// Global services (shared across the app)
let gatewayService: OpenClawGatewayService;
let taskService: TaskService;
let statusSyncService: StatusSyncService;
let dockerService: DockerService;

// Environment variables
const PORT = parseInt(process.env.PORT || '3100');
const HOST = process.env.HOST || '0.0.0.0';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/devalliance';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: NODE_ENV === 'production' ? 'info' : 'debug',
    transport: NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    } : undefined
  }
});

// Register plugins
async function registerPlugins() {
  // CORS
  await fastify.register(cors, {
    origin: true,
    credentials: true
  });

  // Swagger OpenAPI
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'DevAlliance Mission Control API',
        description: 'Backend API for DevAlliance Mission Control - Multi-agent orchestration system',
        version: '2.0.0'
      },
      servers: [
        {
          url: 'http://localhost:3100',
          description: 'Development server'
        }
      ],
      tags: [
        { name: 'Agents', description: 'Agent management endpoints' },
        { name: 'Tasks', description: 'Task management endpoints' },
        { name: 'Status', description: 'System status endpoints' },
        { name: 'Health', description: 'Health check endpoints' },
        { name: 'Config', description: 'Configuration endpoints' }
      ]
    }
  });

  // Swagger UI
  await fastify.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true
    },
    staticCSP: true,
    transformStaticCSP: (header) => header
  });

  // Database
  await fastify.register(databasePlugin, {
    uri: MONGODB_URI
  });

  // WebSocket support
  await fastify.register(websocketPlugin);
}

// Register routes
async function registerRoutes() {
  // Health & config routes (no /api prefix)
  await fastify.register(healthRoutes);

  // API routes (with /api prefix)
  await fastify.register(async (instance) => {
    await instance.register(agentRoutes, { prefix: '/api' });
    await instance.register(statusRoutes, { prefix: '/api' });
    await instance.register(taskRoutes, { prefix: '/api' });
    await instance.register(metricsRoutes, { prefix: '/api' });
    await instance.register(activityRoutes, { prefix: '/api' });
    
    // Gateway routes (requires services to be initialized)
    await instance.register(async (gatewayInstance) => {
      await gatewayRoutes(gatewayInstance, gatewayService, taskService, statusSyncService);
    }, { prefix: '/api' });
  });
}

// Initialize OpenClaw services
async function initializeOpenClawServices() {
  try {
    console.log('[OpenClaw] Initializing services...');
    
    // Initialize Docker service
    dockerService = new DockerService();
    
    // Initialize Gateway service
    gatewayService = new OpenClawGatewayService();
    
    // Initialize Task service with gateway
    taskService = new TaskService(gatewayService);
    
    // Initialize Status Sync service
    statusSyncService = new StatusSyncService(gatewayService, dockerService);
    
    // Set up event listeners for real-time updates
    setupEventListeners();
    
    // Connect to all agents
    await gatewayService.initializeAllAgents();
    
    // Start status sync
    statusSyncService.startPeriodicSync(30000); // 30 seconds
    
    console.log('[OpenClaw] ✅ Services initialized successfully');
    
  } catch (error) {
    console.error('[OpenClaw] ❌ Failed to initialize services:', error);
  }
}

// Set up event listeners for real-time broadcast
function setupEventListeners() {
  // Gateway events
  gatewayService.on('agent:connected', (data) => {
    console.log(`[OpenClaw] Agent connected: ${data.agentId}`);
    fastify.websocketBroadcast.send('agent:connected', data);
  });
  
  gatewayService.on('agent:disconnected', (data) => {
    console.log(`[OpenClaw] Agent disconnected: ${data.agentId}`);
    fastify.websocketBroadcast.send('agent:disconnected', data);
  });
  
  gatewayService.on('agent:error', (data) => {
    console.log(`[OpenClaw] Agent error: ${data.agentId}`);
    fastify.websocketBroadcast.send('agent:error', data);
  });
  
  gatewayService.on('agent:notification', (data) => {
    console.log(`[OpenClaw] Agent notification: ${data.agentId} - ${data.method}`);
    fastify.websocketBroadcast.send('agent:notification', data);
  });
  
  // Task events
  taskService.on('task:output', (data) => {
    fastify.websocketBroadcast.send('agent:output', data);
  });
  
  // Status events
  statusSyncService.on('agent:status', (data) => {
    fastify.websocketBroadcast.send('agent:status', data);
  });
}

// Startup
async function start() {
  try {
    // Register plugins
    await registerPlugins();

    // Initialize OpenClaw services BEFORE registering routes
    await initializeOpenClawServices();

    // Register routes (including gateway routes that need services)
    await registerRoutes();

    // Start server
    await fastify.listen({ port: PORT, host: HOST });

    fastify.log.info('🚀 DevAlliance Mission Control Backend v2.0.0');
    fastify.log.info(`📊 Server: http://${HOST}:${PORT}`);
    fastify.log.info(`📚 Swagger UI: http://${HOST}:${PORT}/docs`);
    fastify.log.info(`🔌 API: http://${HOST}:${PORT}/api`);
    fastify.log.info(`🌍 Environment: ${NODE_ENV}`);
    fastify.log.info(`🗄️  MongoDB: ${MONGODB_URI}`);

    // Seed initial activities
    await seedActivities();

  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, shutting down gracefully...`);
    
    // Shutdown OpenClaw services
    if (gatewayService) {
      await gatewayService.shutdown();
    }
    if (statusSyncService) {
      statusSyncService.stopPeriodicSync();
    }
    
    await fastify.close();
    process.exit(0);
  });
});

// Start the server
start();
