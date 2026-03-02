import WebSocket from 'ws';
import { AgentModel } from '../models/Agent.model';
import { EventEmitter } from 'events';

export interface GatewayConnection {
  agentId: string;
  wsClient: WebSocket;
  token: string;
  url: string;
  status: 'connected' | 'disconnected' | 'error';
  lastPing?: Date;
  reconnectAttempts: number;
  sessionId?: string;
}

export interface RPCRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id: number;
}

export interface RPCResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: number;
}

export class OpenClawGatewayService extends EventEmitter {
  private connections: Map<string, GatewayConnection> = new Map();
  private pendingRequests: Map<number, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map();
  private rpcIdCounter: number = 1;
  private heartbeatInterval?: NodeJS.Timeout;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 5000; // 5 seconds
  private readonly RPC_TIMEOUT = 30000; // 30 seconds

  constructor() {
    super();
    this.startHeartbeat();
  }

  /**
   * Connect to an agent's OpenClaw gateway
   */
  async connectAgent(agentId: string): Promise<void> {
    try {
      // Get agent info from database
      const agent = await AgentModel.findOne({ id: agentId });
      if (!agent) {
        throw new Error(`Agent ${agentId} not found in database`);
      }

      if (!agent.gateway?.url || !agent.gateway?.token) {
        throw new Error(`Agent ${agentId} missing gateway configuration`);
      }

      // Check if already connected
      if (this.connections.has(agentId)) {
        const existing = this.connections.get(agentId)!;
        if (existing.status === 'connected') {
          console.log(`[OpenClaw] Agent ${agentId} already connected`);
          return;
        }
        // Clean up old connection
        await this.disconnectAgent(agentId);
      }

      const url = agent.gateway.url;
      const token = agent.gateway.token;

      console.log(`[OpenClaw] Connecting to agent ${agentId} at ${url}...`);

      // Create WebSocket connection with authorization header
      const ws = new WebSocket(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const connection: GatewayConnection = {
        agentId,
        wsClient: ws,
        token,
        url,
        status: 'disconnected',
        reconnectAttempts: 0
      };

      this.connections.set(agentId, connection);

      // Set up event handlers
      ws.on('open', () => this.handleOpen(agentId));
      ws.on('message', (data: WebSocket.RawData) => this.handleMessage(agentId, data));
      ws.on('error', (error: Error) => this.handleError(agentId, error));
      ws.on('close', () => this.handleClose(agentId));
      ws.on('ping', () => ws.pong());

    } catch (error: any) {
      console.error(`[OpenClaw] Failed to connect agent ${agentId}:`, error.message);
      throw error;
    }
  }

  /**
   * Disconnect from an agent's gateway
   */
  async disconnectAgent(agentId: string): Promise<void> {
    const connection = this.connections.get(agentId);
    if (!connection) return;

    console.log(`[OpenClaw] Disconnecting agent ${agentId}...`);

    try {
      if (connection.wsClient.readyState === WebSocket.OPEN) {
        connection.wsClient.close(1000, 'Normal closure');
      }
    } catch (error) {
      console.error(`[OpenClaw] Error closing connection for ${agentId}:`, error);
    }

    this.connections.delete(agentId);
    this.emit('agent:disconnected', { agentId });
  }

  /**
   * Send RPC request to agent's gateway
   */
  async sendRPC(agentId: string, method: string, params?: any): Promise<any> {
    const connection = this.connections.get(agentId);
    
    if (!connection) {
      throw new Error(`Agent ${agentId} is not connected`);
    }

    if (connection.status !== 'connected') {
      throw new Error(`Agent ${agentId} gateway is not ready (status: ${connection.status})`);
    }

    const id = this.rpcIdCounter++;
    const request: RPCRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id
    };

    return new Promise((resolve, reject) => {
      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`RPC timeout for method ${method} on agent ${agentId}`));
      }, this.RPC_TIMEOUT);

      // Store pending request
      this.pendingRequests.set(id, { resolve, reject, timeout });

      // Send request
      try {
        connection.wsClient.send(JSON.stringify(request));
        console.log(`[OpenClaw] RPC → ${agentId}: ${method}`, params ? JSON.stringify(params).slice(0, 100) : '');
      } catch (error: any) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(new Error(`Failed to send RPC: ${error.message}`));
      }
    });
  }

  /**
   * Health check for agent gateway
   */
  async healthCheck(agentId: string): Promise<boolean> {
    try {
      const connection = this.connections.get(agentId);
      if (!connection || connection.status !== 'connected') {
        return false;
      }

      // Try a simple ping RPC
      await this.sendRPC(agentId, 'gateway.status', {});
      return true;
    } catch (error) {
      console.error(`[OpenClaw] Health check failed for ${agentId}:`, error);
      return false;
    }
  }

  /**
   * Get agent info from gateway
   */
  async getAgentInfo(agentId: string): Promise<any> {
    try {
      const result = await this.sendRPC(agentId, 'gateway.info', {});
      return result;
    } catch (error: any) {
      console.error(`[OpenClaw] Failed to get info for ${agentId}:`, error.message);
      return null;
    }
  }

  /**
   * Get connection status for an agent
   */
  getConnectionStatus(agentId: string): 'connected' | 'disconnected' | 'error' | 'unknown' {
    const connection = this.connections.get(agentId);
    return connection ? connection.status : 'unknown';
  }

  /**
   * Get all connected agents
   */
  getConnectedAgents(): string[] {
    return Array.from(this.connections.entries())
      .filter(([_, conn]) => conn.status === 'connected')
      .map(([agentId]) => agentId);
  }

  /**
   * Initialize connections for all agents in database
   */
  async initializeAllAgents(): Promise<void> {
    console.log('[OpenClaw] Initializing connections for all agents...');
    
    const agents = await AgentModel.find({
      'gateway.url': { $exists: true },
      'gateway.token': { $exists: true }
    });

    console.log(`[OpenClaw] Found ${agents.length} agents with gateway configuration`);

    for (const agent of agents) {
      try {
        await this.connectAgent(agent.id);
      } catch (error: any) {
        console.error(`[OpenClaw] Failed to initialize agent ${agent.id}:`, error.message);
      }
    }
  }

  /**
   * Shutdown all connections
   */
  async shutdown(): Promise<void> {
    console.log('[OpenClaw] Shutting down all gateway connections...');
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    const agentIds = Array.from(this.connections.keys());
    await Promise.all(agentIds.map(id => this.disconnectAgent(id)));
  }

  // ========== Private Methods ==========

  private handleOpen(agentId: string): void {
    const connection = this.connections.get(agentId);
    if (!connection) return;

    console.log(`[OpenClaw] ✅ Agent ${agentId} connected`);
    connection.status = 'connected';
    connection.reconnectAttempts = 0;
    connection.lastPing = new Date();

    this.emit('agent:connected', { agentId });
  }

  private handleMessage(agentId: string, data: WebSocket.RawData): void {
    try {
      const message = JSON.parse(data.toString());
      
      // Handle RPC response
      if (message.jsonrpc === '2.0' && message.id !== undefined) {
        this.handleRPCResponse(agentId, message);
      }
      // Handle notification (no id)
      else if (message.jsonrpc === '2.0' && message.method) {
        this.handleNotification(agentId, message);
      }
      // Handle other messages
      else {
        console.log(`[OpenClaw] Message from ${agentId}:`, message);
        this.emit('agent:message', { agentId, message });
      }
    } catch (error) {
      console.error(`[OpenClaw] Failed to parse message from ${agentId}:`, error);
    }
  }

  private handleRPCResponse(agentId: string, response: RPCResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) {
      console.warn(`[OpenClaw] Received response for unknown request ID ${response.id}`);
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(response.id);

    if (response.error) {
      console.error(`[OpenClaw] RPC error from ${agentId}:`, response.error);
      pending.reject(new Error(response.error.message));
    } else {
      pending.resolve(response.result);
    }
  }

  private handleNotification(agentId: string, notification: any): void {
    console.log(`[OpenClaw] Notification from ${agentId}:`, notification.method);
    this.emit('agent:notification', {
      agentId,
      method: notification.method,
      params: notification.params
    });
  }

  private handleError(agentId: string, error: Error): void {
    const connection = this.connections.get(agentId);
    if (!connection) return;

    console.error(`[OpenClaw] ❌ Error on agent ${agentId}:`, error.message);
    connection.status = 'error';

    this.emit('agent:error', { agentId, error });
  }

  private handleClose(agentId: string): void {
    const connection = this.connections.get(agentId);
    if (!connection) return;

    console.log(`[OpenClaw] Connection closed for agent ${agentId}`);
    connection.status = 'disconnected';

    this.emit('agent:disconnected', { agentId });

    // Attempt to reconnect
    if (connection.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.scheduleReconnect(agentId);
    } else {
      console.error(`[OpenClaw] Max reconnect attempts reached for agent ${agentId}`);
    }
  }

  private scheduleReconnect(agentId: string): void {
    const connection = this.connections.get(agentId);
    if (!connection) return;

    connection.reconnectAttempts++;
    const delay = this.RECONNECT_DELAY * connection.reconnectAttempts;

    console.log(`[OpenClaw] Scheduling reconnect for ${agentId} in ${delay}ms (attempt ${connection.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);

    setTimeout(() => {
      this.reconnect(agentId);
    }, delay);
  }

  private async reconnect(agentId: string): Promise<void> {
    try {
      console.log(`[OpenClaw] Attempting to reconnect agent ${agentId}...`);
      await this.connectAgent(agentId);
    } catch (error: any) {
      console.error(`[OpenClaw] Reconnect failed for ${agentId}:`, error.message);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, this.HEARTBEAT_INTERVAL);
  }

  private async performHeartbeat(): Promise<void> {
    const now = new Date();
    
    for (const [agentId, connection] of this.connections.entries()) {
      if (connection.status !== 'connected') continue;

      try {
        // Send ping via WebSocket
        if (connection.wsClient.readyState === WebSocket.OPEN) {
          connection.wsClient.ping();
          connection.lastPing = now;
        }
      } catch (error) {
        console.error(`[OpenClaw] Heartbeat failed for ${agentId}:`, error);
      }
    }
  }
}
