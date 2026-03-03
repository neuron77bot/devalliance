import WebSocket from 'ws';
import { AgentModel } from '../models/Agent.model';
import { EventEmitter } from 'events';

export interface GatewayConnection {
  agentId: string;
  wsClient: WebSocket;
  token: string;
  url: string;
  status: 'handshaking' | 'connected' | 'disconnected' | 'error';
  lastPing?: Date;
  reconnectAttempts: number;
  sessionId?: string;
  protocol?: number;
}

export interface GatewayFrame {
  type: 'req' | 'res' | 'event';
  id?: string | number;
  method?: string;
  params?: any;
  ok?: boolean;
  payload?: any;
  error?: any;
  event?: string;
  seq?: number;
  stateVersion?: string;
}

export class OpenClawGatewayService extends EventEmitter {
  private connections: Map<string, GatewayConnection> = new Map();
  private pendingRequests: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map();
  private rpcIdCounter: number = 1;
  private heartbeatInterval?: NodeJS.Timeout;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 5000; // 5 seconds
  private readonly RPC_TIMEOUT = 30000; // 30 seconds
  private readonly PROTOCOL_VERSION = 3;

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

      // Create WebSocket connection WITHOUT auth header (protocol doesn't use it)
      const ws = new WebSocket(url);

      const connection: GatewayConnection = {
        agentId,
        wsClient: ws,
        token,
        url,
        status: 'handshaking',
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
   * Send RPC request to agent's gateway using Gateway Protocol
   */
  async sendRPC(agentId: string, method: string, params?: any): Promise<any> {
    const connection = this.connections.get(agentId);
    
    if (!connection) {
      throw new Error(`Agent ${agentId} is not connected`);
    }

    if (connection.status !== 'connected') {
      throw new Error(`Agent ${agentId} gateway is not ready (status: ${connection.status})`);
    }

    const id = `rpc-${this.rpcIdCounter++}-${Date.now()}`;
    const request: GatewayFrame = {
      type: 'req',
      id,
      method,
      params: params || {}
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

      // Try a simple status check
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
      const result = await this.sendRPC(agentId, 'agent.info', {});
      return result;
    } catch (error: any) {
      console.error(`[OpenClaw] Failed to get info for ${agentId}:`, error.message);
      return null;
    }
  }

  /**
   * Get connection status for an agent
   */
  getConnectionStatus(agentId: string): 'connected' | 'handshaking' | 'disconnected' | 'error' | 'unknown' {
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
   * Send chat message to agent and wait for response
   */
  async sendChatMessage(
    agentId: string,
    message: string,
    options?: {
      sessionKey?: string;
      deliver?: boolean;
      thinking?: string;
      timeoutSeconds?: number;
    }
  ): Promise<{
    reply?: string;
    sessionKey?: string;
    messageId?: string;
  }> {
    const connection = this.connections.get(agentId);
    
    if (!connection) {
      throw new Error(`Agent ${agentId} is not connected`);
    }

    if (connection.status !== 'connected') {
      throw new Error(`Agent ${agentId} gateway is not ready (status: ${connection.status})`);
    }

    const timeoutMs = (options?.timeoutSeconds || 300) * 1000;
    const requestId = `chat-${this.rpcIdCounter++}-${Date.now()}`;

    // Build chat.send params according to OpenClaw protocol
    const params: any = {
      sessionKey: options?.sessionKey || `api-${Date.now()}`,
      idempotencyKey: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      message
    };

    if (options?.deliver !== undefined) {
      params.deliver = options.deliver;
    }

    if (options?.thinking) {
      params.thinking = options.thinking;
    }

    const request: GatewayFrame = {
      type: 'req',
      id: requestId,
      method: 'chat.send',
      params
    };

    return new Promise((resolve, reject) => {
      // Listen for chat reply events (register BEFORE sending request)
      const eventHandler = (eventData: any) => {
        console.log(`[OpenClaw] Event handler called for ${agentId}, event: ${eventData.event}, requestId: ${requestId}`);
        
        if (eventData.agentId !== agentId) return;

        // Look for chat events
        if (eventData.event === 'chat') {
          const payload = eventData.payload;
          
          console.log(`[OpenClaw] Chat event for request ${requestId}:`, JSON.stringify(payload, null, 2));
          
          // Check state
          if (payload?.state === 'error') {
            // Handle error
            clearTimeout(timeout);
            this.removeListener('agent:event', eventHandler);
            this.pendingRequests.delete(requestId);
            
            reject(new Error(payload.errorMessage || 'Chat error'));
            return;
          }
          
          if (payload?.state === 'complete' || payload?.state === 'done') {
            // Extract reply text
            let reply: string | undefined;
            if (payload?.content) {
              reply = payload.content;
            } else if (payload?.text) {
              reply = payload.text;
            } else if (payload?.response) {
              reply = payload.response;
            } else if (payload?.message) {
              reply = payload.message;
            }

            if (reply) {
              clearTimeout(timeout);
              this.removeListener('agent:event', eventHandler);
              this.pendingRequests.delete(requestId);
              
              resolve({
                reply,
                sessionKey: payload?.sessionKey,
                messageId: payload?.runId || payload?.messageId || payload?.id
              });
            }
          }
        }
      };

      // Register event listener FIRST
      this.on('agent:event', eventHandler);

      // Set timeout AFTER registering listener
      const timeout = setTimeout(() => {
        this.removeListener('agent:event', eventHandler);
        reject(new Error(`Chat timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      // DO NOT store in pendingRequests - we'll handle the response via events only
      // The RPC response comes immediately but the actual chat completion comes via events

      // Send request LAST
      try {
        connection.wsClient.send(JSON.stringify(request));
        console.log(`[OpenClaw] Chat message sent to ${agentId}:`, message.slice(0, 100));
      } catch (error: any) {
        clearTimeout(timeout);
        this.removeListener('agent:event', eventHandler);
        this.pendingRequests.delete(requestId);
        reject(new Error(`Failed to send chat message: ${error.message}`));
      }
    });
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

    console.log(`[OpenClaw] WebSocket opened for ${agentId}, waiting for challenge...`);
    // Don't mark as connected yet - wait for challenge + hello-ok
  }

  private handleMessage(agentId: string, data: WebSocket.RawData): void {
    try {
      const message: GatewayFrame = JSON.parse(data.toString());
      const connection = this.connections.get(agentId);
      if (!connection) return;

      // Handle challenge event (first message after connect)
      if (message.type === 'event' && message.event === 'connect.challenge') {
        console.log(`[OpenClaw] Challenge payload for ${agentId}:`, JSON.stringify(message.payload));
        this.handleChallenge(agentId, message.payload);
        return;
      }

      // Handle hello-ok response (handshake complete)
      if (message.type === 'res' && message.payload?.type === 'hello-ok') {
        this.handleHelloOk(agentId, message);
        return;
      }

      // Handle RPC response
      if (message.type === 'res' && message.id !== undefined) {
        this.handleRPCResponse(agentId, message);
        return;
      }

      // Handle events (notifications)
      if (message.type === 'event') {
        this.handleEvent(agentId, message);
        return;
      }

      // Log unknown messages
      console.log(`[OpenClaw] Message from ${agentId}:`, message);
      this.emit('agent:message', { agentId, message });

    } catch (error) {
      console.error(`[OpenClaw] Failed to parse message from ${agentId}:`, error);
    }
  }

  private handleChallenge(agentId: string, _payload: any): void {
    const connection = this.connections.get(agentId);
    if (!connection) return;

    console.log(`[OpenClaw] Received challenge from ${agentId}, sending connect request...`);

    const requestId = `connect-${agentId}-${Date.now()}`;
    const connectRequest: GatewayFrame = {
      type: 'req',
      id: requestId,
      method: 'connect',
      params: {
        minProtocol: this.PROTOCOL_VERSION,
        maxProtocol: this.PROTOCOL_VERSION,
        client: {
          id: 'cli',
          version: '2.0.0',
          platform: 'linux',
          mode: 'cli'
        },
        role: 'operator',
        scopes: ['operator.read', 'operator.write', 'operator.admin'],
        caps: [],
        commands: [],
        permissions: {},
        auth: {
          token: connection.token
        },
        locale: 'es-AR',
        userAgent: 'DevAlliance-MissionControl/2.0.0'
      }
    };

    // Create promise for hello-ok response (though we handle it differently)
    // Store in pending requests so we can track it
    const timeout = setTimeout(() => {
      this.pendingRequests.delete(requestId);
      console.warn(`[OpenClaw] Connect handshake timeout for ${agentId}`);
      connection.status = 'error';
    }, this.RPC_TIMEOUT);

    this.pendingRequests.set(requestId, {
      resolve: () => {}, // Will be handled by handleHelloOk
      reject: () => {},
      timeout
    });

    try {
      const payload = JSON.stringify(connectRequest);
      console.log(`[OpenClaw] Sending connect request for ${agentId}:`, payload.slice(0, 200));
      connection.wsClient.send(payload);
    } catch (error: any) {
      clearTimeout(timeout);
      this.pendingRequests.delete(requestId);
      console.error(`[OpenClaw] Failed to send connect request for ${agentId}:`, error.message);
      connection.status = 'error';
      this.emit('agent:error', { agentId, error });
    }
  }

  private handleHelloOk(agentId: string, message: GatewayFrame): void {
    const connection = this.connections.get(agentId);
    if (!connection) return;

    // Clean up pending connect request
    const requestId = String(message.id);
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(requestId);
    }

    console.log(`[OpenClaw] ✅ Agent ${agentId} connected (protocol v${message.payload.protocol})`);
    
    connection.status = 'connected';
    connection.protocol = message.payload.protocol;
    connection.reconnectAttempts = 0;
    connection.lastPing = new Date();

    // Store device token if provided
    if (message.payload.auth?.deviceToken) {
      // Could store this for future use
      console.log(`[OpenClaw] Received device token for ${agentId}`);
    }

    this.emit('agent:connected', { agentId, protocol: connection.protocol });
  }

  private handleRPCResponse(agentId: string, response: GatewayFrame): void {
    const requestId = String(response.id);
    const pending = this.pendingRequests.get(requestId);
    if (!pending) {
      console.warn(`[OpenClaw] Received response for unknown request ID ${response.id}`);
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(requestId);

    if (!response.ok || response.error) {
      const errorMsg = response.error?.message || response.error || 'Unknown error';
      console.error(`[OpenClaw] RPC error from ${agentId}:`, errorMsg);
      pending.reject(new Error(errorMsg));
    } else {
      pending.resolve(response.payload);
    }
  }

  private handleEvent(agentId: string, event: GatewayFrame): void {
    console.log(`[OpenClaw] Event from ${agentId}: ${event.event}`);
    
    // Log chat events with full payload for debugging
    if (event.event === 'chat') {
      console.log(`[OpenClaw] Chat event payload for ${agentId}:`, JSON.stringify(event.payload, null, 2));
    }
    
    this.emit('agent:event', {
      agentId,
      event: event.event,
      payload: event.payload,
      seq: event.seq,
      stateVersion: event.stateVersion
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
