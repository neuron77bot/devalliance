#!/usr/bin/env node
/**
 * Test script para verificar comunicación entre gateways OpenClaw
 * Ejecutar con: docker exec openclaw-arquitecto node /tmp/test-communication.js
 */

const WebSocket = require('ws');

// Configuración
const DEVELOPER_URL = 'ws://openclaw-developer:18789';
const DEVELOPER_TOKEN = 'f64422d81639a4765a3a6a0eb6bd898eb0eb852ca4770224';

console.log('🔗 Conectando a Developer gateway...');
console.log(`   URL: ${DEVELOPER_URL}`);

const ws = new WebSocket(DEVELOPER_URL);

ws.on('open', () => {
  console.log('✅ Conexión WebSocket establecida');
  
  // Enviar mensaje RPC de status
  const rpcRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'status',
    params: {}
  };
  
  console.log('📤 Enviando request: status');
  ws.send(JSON.stringify(rpcRequest));
});

ws.on('message', (data) => {
  console.log('📥 Respuesta recibida:');
  try {
    const response = JSON.parse(data.toString());
    console.log(JSON.stringify(response, null, 2));
  } catch (e) {
    console.log(data.toString());
  }
  ws.close();
});

ws.on('error', (error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('🔌 Conexión cerrada');
  process.exit(0);
});

// Timeout
setTimeout(() => {
  console.error('⏱️  Timeout - sin respuesta en 10s');
  ws.close();
  process.exit(1);
}, 10000);
