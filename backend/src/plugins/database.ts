import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import mongoose from 'mongoose';

export interface DatabasePluginOptions {
  uri: string;
}

async function databasePlugin(fastify: FastifyInstance, options: DatabasePluginOptions) {
  try {
    fastify.log.info('Connecting to MongoDB...');
    
    await mongoose.connect(options.uri);
    
    fastify.log.info('✅ MongoDB connected successfully');

    // Graceful shutdown
    fastify.addHook('onClose', async () => {
      fastify.log.info('Closing MongoDB connection...');
      await mongoose.connection.close();
    });

  } catch (error) {
    fastify.log.error({ error }, '❌ MongoDB connection error');
    throw error;
  }
}

export default fp(databasePlugin, {
  name: 'database'
});
