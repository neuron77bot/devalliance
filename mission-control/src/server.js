const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3100;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Load agents config
const agentsConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../config/agents.json'), 'utf8')
);

// Gateway RPC Helper
async function callGateway(agentId, method, params = {}) {
  const agent = agentsConfig.agents.find(a => a.id === agentId);
  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(agent.gateway.url);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Gateway timeout'));
    }, 10000);

    ws.on('open', () => {
      const rpcRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params
      };
      ws.send(JSON.stringify(rpcRequest));
    });

    ws.on('message', (data) => {
      clearTimeout(timeout);
      try {
        const response = JSON.parse(data.toString());
        ws.close();
        if (response.error) {
          reject(new Error(response.error.message || 'RPC error'));
        } else {
          resolve(response.result);
        }
      } catch (e) {
        reject(e);
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

// Check gateway health (HTTP)
async function checkHealth(agentId) {
  const agent = agentsConfig.agents.find(a => a.id === agentId);
  if (!agent) return { status: 'unknown' };

  return new Promise((resolve) => {
    const healthUrl = agent.gateway.healthUrl.replace(/^http:\/\//, '');
    const parts = healthUrl.split('/');
    const hostPort = parts[0];
    const [hostname, portStr] = hostPort.split(':');
    const port = parseInt(portStr || '80');
    
    const req = http.get({
      hostname,
      port,
      path: '/healthz',
      timeout: 5000
    }, (res) => {
      resolve({ 
        status: res.statusCode === 200 ? 'healthy' : 'unhealthy',
        statusCode: res.statusCode
      });
    });

    req.on('error', () => {
      resolve({ status: 'offline' });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 'timeout' });
    });
  });
}

// Routes

// GET /api/agents - List all agents
app.get('/api/agents', (req, res) => {
  res.json({
    ok: true,
    agents: agentsConfig.agents.map(a => ({
      id: a.id,
      name: a.name,
      role: a.role,
      description: a.description,
      capabilities: a.capabilities
    }))
  });
});

// GET /api/agents/:id/status - Get agent status
app.get('/api/agents/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const health = await checkHealth(id);
    
    let gatewayStatus = null;
    if (health.status === 'healthy') {
      try {
        // Get detailed status including sessions
        gatewayStatus = await callGateway(id, 'status');
        
        // Try to get sessions list
        try {
          const sessionsResult = await callGateway(id, 'sessions.list', { limit: 10 });
          if (sessionsResult && sessionsResult.sessions) {
            gatewayStatus.sessions = sessionsResult.sessions;
            gatewayStatus.sessionCount = sessionsResult.count || sessionsResult.sessions.length;
          }
        } catch (e) {
          console.warn(`Failed to get sessions for ${id}:`, e.message);
        }
      } catch (e) {
        console.error(`Failed to get gateway status for ${id}:`, e.message);
      }
    }

    res.json({
      ok: true,
      agent: agentsConfig.agents.find(a => a.id === id),
      health,
      gatewayStatus
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// GET /api/status - Get status of all agents
app.get('/api/status', async (req, res) => {
  try {
    const statuses = await Promise.all(
      agentsConfig.agents.map(async (agent) => {
        const health = await checkHealth(agent.id);
        return {
          id: agent.id,
          name: agent.name,
          role: agent.role,
          health: health.status,
          url: agent.gateway.url
        };
      })
    );

    res.json({
      ok: true,
      agents: statuses,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// POST /api/agents/:id/call - Call gateway RPC method
app.post('/api/agents/:id/call', async (req, res) => {
  try {
    const { id } = req.params;
    const { method, params } = req.body;

    if (!method) {
      return res.status(400).json({
        ok: false,
        error: 'method is required'
      });
    }

    const result = await callGateway(id, method, params || {});
    
    res.json({
      ok: true,
      result
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// Config endpoint for frontend
app.get('/config', (req, res) => {
  res.json({
    baseUrl: process.env.BASE_URL || '',
    basePath: process.env.BASE_PATH || '',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'mission-control' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DevAlliance Mission Control running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔌 API: http://localhost:${PORT}/api`);
  console.log(`\n👥 Agents configured: ${agentsConfig.agents.length}`);
  agentsConfig.agents.forEach(a => {
    console.log(`   - ${a.name} (${a.role})`);
  });
});
