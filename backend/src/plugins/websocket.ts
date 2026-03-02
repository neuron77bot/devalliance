import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifyWebsocket from '@fastify/websocket';
import { WebSocket } from 'ws';
import { metricsService } from '../services/MetricsService';

// Declaración para extender FastifyInstance
declare module 'fastify' {
  interface FastifyInstance {
    websocketClients: Set<WebSocket>;
    websocketBroadcast: { 
      clients: Set<WebSocket>;
      send: (type: string, data: any) => void;
    };
  }
}

async function websocketPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyWebsocket);
  
  // Set para mantener track de conexiones activas
  const clients = new Set<WebSocket>();
  fastify.decorate('websocketClients', clients);
  
  // Helper para broadcast messages
  const broadcast = {
    clients,
    send: (type: string, data: any) => {
      const message = JSON.stringify({
        type,
        data,
        timestamp: new Date().toISOString()
      });
      
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(message);
          } catch (error) {
            fastify.log.error({ error }, 'Error broadcasting to client');
          }
        }
      });
    }
  };
  
  // Decorar también como websocketBroadcast para compatibilidad con routes
  fastify.decorate('websocketBroadcast', broadcast);
  
  // WebSocket endpoint para real-time updates
  fastify.get('/ws', { websocket: true }, (socket) => {
    
    fastify.log.info('WebSocket client connected');
    clients.add(socket);
    
    // Enviar métricas iniciales
    metricsService.getSystemMetrics().then(metrics => {
      socket.send(JSON.stringify({
        type: 'metrics_update',
        data: metrics
      }));
    });
    
    // Intervalo para enviar updates cada 5 segundos
    const interval = setInterval(async () => {
      if (socket.readyState === WebSocket.OPEN) {
        try {
          const systemMetrics = await metricsService.getSystemMetrics();
          const agentMetrics = await metricsService.getAllAgentMetrics();
          
          socket.send(JSON.stringify({
            type: 'metrics_update',
            data: {
              system: systemMetrics,
              agents: agentMetrics
            },
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          fastify.log.error({ error }, 'Error sending metrics update');
        }
      }
    }, 5000);
    
    // Manejar mensajes del cliente
    socket.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        fastify.log.debug({ data }, 'WebSocket message received');
        
        // Ping/pong para keep-alive
        if (data.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        fastify.log.error({ error }, 'Error processing WebSocket message');
      }
    });
    
    // Cleanup al desconectar
    socket.on('close', () => {
      fastify.log.info('WebSocket client disconnected');
      clearInterval(interval);
      clients.delete(socket);
    });
    
    socket.on('error', (error: Error) => {
      fastify.log.error({ error }, 'WebSocket error');
      clearInterval(interval);
      clients.delete(socket);
    });
  });
  
  fastify.log.info('✅ WebSocket support enabled at /ws');
}

export default fp(websocketPlugin, {
  name: 'websocket',
  dependencies: ['database'] // Asegurar que DB esté inicializada
});
