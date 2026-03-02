import WebSocket from 'ws';
import http from 'http';
import { Agent } from '../schemas/agent.schema';

export class GatewayService {
  /**
   * Call OpenClaw gateway RPC method
   */
  async callGateway(agent: Agent, method: string, params: any = {}): Promise<any> {
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

      ws.on('message', (data: WebSocket.Data) => {
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

  /**
   * Check gateway health via HTTP
   */
  async checkHealth(agent: Agent): Promise<{ status: string; statusCode?: number }> {
    return new Promise((resolve) => {
      const healthUrl = agent.gateway.healthUrl.replace(/^http:\/\//, '');
      const parts = healthUrl.split('/');
      const hostPort = parts[0];
      const [hostname, portStr] = hostPort.split(':');
      const port = parseInt(portStr || '80');

      const req = http.get(
        {
          hostname,
          port,
          path: '/healthz',
          timeout: 5000
        },
        (res) => {
          resolve({
            status: res.statusCode === 200 ? 'healthy' : 'unhealthy',
            statusCode: res.statusCode
          });
        }
      );

      req.on('error', () => {
        resolve({ status: 'offline' });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 'timeout' });
      });
    });
  }

  /**
   * Get detailed gateway status including sessions
   */
  async getDetailedStatus(agent: Agent): Promise<any> {
    const health = await this.checkHealth(agent);
    
    let gatewayStatus = null;
    if (health.status === 'healthy') {
      try {
        // Get detailed status
        gatewayStatus = await this.callGateway(agent, 'status');

        // Try to get sessions list
        try {
          const sessionsResult = await this.callGateway(agent, 'sessions.list', { limit: 10 });
          if (sessionsResult && sessionsResult.sessions) {
            gatewayStatus.sessions = sessionsResult.sessions;
            gatewayStatus.sessionCount = sessionsResult.count || sessionsResult.sessions.length;
          }
        } catch (e) {
          console.warn(`Failed to get sessions for ${agent.id}:`, (e as Error).message);
        }
      } catch (e) {
        console.error(`Failed to get gateway status for ${agent.id}:`, (e as Error).message);
      }
    }

    return { health, gatewayStatus };
  }
}
