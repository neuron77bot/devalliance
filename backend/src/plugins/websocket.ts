import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifyWebsocket from '@fastify/websocket';

async function websocketPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyWebsocket);
  
  fastify.log.info('✅ WebSocket support enabled');
}

export default fp(websocketPlugin, {
  name: 'websocket'
});
