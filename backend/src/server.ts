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
import { AgentService } from './services/AgentService';
import fs from 'fs';
import path from 'path';

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
  });
}

// Initialize agents from config file
async function initializeAgents() {
  try {
    // Try both paths: development and production
    const devPath = path.join(__dirname, '../config/agents.json');
    const prodPath = path.join(__dirname, '../../config/agents.json');
    const configPath = fs.existsSync(devPath) ? devPath : prodPath;
    
    if (fs.existsSync(configPath)) {
      fastify.log.info('Loading agents from config file...');
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      
      const agentService = new AgentService();
      await agentService.initializeFromConfig(config.agents);
      
      fastify.log.info(`✅ Initialized ${config.agents.length} agents from config`);
      config.agents.forEach((a: any) => {
        fastify.log.info(`   - ${a.name} (${a.role})`);
      });
    } else {
      fastify.log.warn('⚠️  No config/agents.json found, skipping agent initialization');
    }
  } catch (error) {
    fastify.log.error({ error }, '❌ Failed to initialize agents');
  }
}

// Startup
async function start() {
  try {
    // Register plugins
    await registerPlugins();

    // Register routes
    await registerRoutes();

    // Start server
    await fastify.listen({ port: PORT, host: HOST });

    fastify.log.info('🚀 DevAlliance Mission Control Backend v2.0.0');
    fastify.log.info(`📊 Server: http://${HOST}:${PORT}`);
    fastify.log.info(`📚 Swagger UI: http://${HOST}:${PORT}/docs`);
    fastify.log.info(`🔌 API: http://${HOST}:${PORT}/api`);
    fastify.log.info(`🌍 Environment: ${NODE_ENV}`);
    fastify.log.info(`🗄️  MongoDB: ${MONGODB_URI}`);

    // Initialize agents from config
    await initializeAgents();

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
    await fastify.close();
    process.exit(0);
  });
});

// Start the server
start();
