import { AgentModel, IAgent } from '../models/Agent.model';
import { Agent, CreateAgent, UpdateAgent, validateTelegramConfig, ChatRequest, ChatResponse, TUITokenResponse } from '../schemas/agent.schema';
import { GatewayService } from './GatewayService';
import { DockerService } from './DockerService';
import { OpenClawGatewayService } from './OpenClawGatewayService';

export class AgentService {
  private gatewayService: GatewayService;
  private dockerService: DockerService;
  private openclawGatewayService?: OpenClawGatewayService;

  constructor(openclawGatewayService?: OpenClawGatewayService) {
    this.gatewayService = new GatewayService();
    this.dockerService = new DockerService();
    this.openclawGatewayService = openclawGatewayService;
  }

  /**
   * Get all agents from database
   */
  async getAllAgents(): Promise<any[]> {
    return await AgentModel.find().select('-__v').lean();
  }

  /**
   * Get all agents with real-time Docker container status
   */
  async getAllAgentsWithStatus(): Promise<any[]> {
    const agents = await this.getAllAgents();
    
    const agentsWithStatus = await Promise.all(
      agents.map(async (agent) => {
        const containerStatus = await this.dockerService.getContainerStatus(agent.id);
        
        console.log(`[DEBUG] Agent ${agent.id} - Container status:`, containerStatus);
        
        // Map container status to agent status
        let status = 'offline';
        if (containerStatus.running) {
          status = 'healthy';
        } else if (containerStatus.error) {
          status = 'error';
        }
        
        const result = {
          id: agent.id,
          name: agent.name,
          role: agent.role,
          description: agent.description,
          capabilities: agent.capabilities,
          status,
          containerRunning: containerStatus.running
        };
        
        console.log(`[DEBUG] Agent ${agent.id} - Result:`, result);
        
        return result;
      })
    );
    
    console.log(`[DEBUG] Final agents with status:`, agentsWithStatus);
    
    return agentsWithStatus;
  }

  /**
   * Get agent by ID
   */
  async getAgentById(id: string): Promise<any | null> {
    return await AgentModel.findOne({ id }).select('-__v').lean();
  }

  /**
   * Create or update agent
   */
  async upsertAgent(agentData: Agent): Promise<IAgent> {
    const agent = await AgentModel.findOneAndUpdate(
      { id: agentData.id },
      agentData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return agent;
  }

  /**
   * Create a new agent with Docker container
   */
  async createAgent(data: CreateAgent): Promise<Agent> {
    // Validate Telegram config if enabled
    if (data.enableTelegram) {
      validateTelegramConfig(data);
    }

    // Generate unique ID from name (lowercase, replace spaces with hyphens)
    const id = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Check if agent already exists
    const existing = await this.getAgentById(id);
    if (existing) {
      throw new Error(`Agent with ID '${id}' already exists`);
    }

    // Get next available port
    const port = data.port || await this.dockerService.getNextAvailablePort();

    // Generate gateway token
    const gatewayToken = this.dockerService.generateGatewayToken();

    // Verify Telegram token and get bot info if Telegram is enabled
    let telegramConfig: any = undefined;
    if (data.enableTelegram && data.telegramToken) {
      try {
        const botInfo = await this.verifyTelegramToken(data.telegramToken);
        telegramConfig = {
          enabled: true,
          token: data.telegramToken,
          botUsername: botInfo?.username
        };
      } catch (error: any) {
        throw new Error(`Telegram verification failed: ${error.message}`);
      }
    }

    // Create agent object
    // Note: Both backend and agent containers use network host mode
    // Backend connects to gateway via localhost
    const agent: any = {
      id,
      name: data.name,
      role: data.role,
      description: data.description,
      capabilities: data.capabilities || [],
      gateway: {
        url: `ws://127.0.0.1:${port}`,
        token: gatewayToken,
        healthUrl: `http://127.0.0.1:${port}/healthz`
      }
    };

    // Add Telegram info to agent (without the token)
    if (telegramConfig) {
      agent.telegram = {
        enabled: true,
        botUsername: telegramConfig.botUsername
      };
    }

    // Save to database
    await this.upsertAgent(agent);

    // Create Docker container
    try {
      await this.dockerService.ensureNetworkExists();
      await this.dockerService.createContainer({
        id,
        name: data.name,
        port,
        gatewayToken,
        telegram: telegramConfig  // Pass full telegram config including token
      });
    } catch (error) {
      // Rollback: delete from database if container creation fails
      await AgentModel.deleteOne({ id });
      throw error;
    }

    return agent;
  }

  /**
   * Update an existing agent
   */
  async updateAgent(id: string, data: UpdateAgent): Promise<Agent> {
    const agent = await this.getAgentById(id);
    if (!agent) {
      throw new Error(`Agent with ID '${id}' not found`);
    }

    // Update only provided fields
    const updatedAgent: Agent = {
      id: agent.id,
      name: data.name || agent.name,
      role: data.role || agent.role,
      description: data.description || agent.description,
      capabilities: data.capabilities !== undefined ? data.capabilities : agent.capabilities,
      gateway: agent.gateway
    };

    // Save to database
    await this.upsertAgent(updatedAgent);

    return updatedAgent;
  }

  /**
   * Delete an agent and its Docker container
   */
  async deleteAgent(id: string): Promise<void> {
    const agent = await this.getAgentById(id);
    if (!agent) {
      throw new Error(`Agent with ID '${id}' not found`);
    }

    // Remove Docker container
    try {
      await this.dockerService.removeContainer(id);
    } catch (error) {
      console.error(`Error removing container for ${id}:`, error);
      // Continue with deletion even if container removal fails
    }

    // Delete from database
    await AgentModel.deleteOne({ id });
  }

  /**
   * Start agent's Docker container
   */
  async startAgent(id: string): Promise<void> {
    const agent = await this.getAgentById(id);
    if (!agent) {
      throw new Error(`Agent with ID '${id}' not found`);
    }

    await this.dockerService.startContainer(id);
  }

  /**
   * Stop agent's Docker container
   */
  async stopAgent(id: string): Promise<void> {
    const agent = await this.getAgentById(id);
    if (!agent) {
      throw new Error(`Agent with ID '${id}' not found`);
    }

    await this.dockerService.stopContainer(id);
  }

  /**
   * Restart agent's Docker container
   */
  async restartAgent(id: string): Promise<void> {
    const agent = await this.getAgentById(id);
    if (!agent) {
      throw new Error(`Agent with ID '${id}' not found`);
    }

    await this.dockerService.restartContainer(id);
  }

  /**
   * Get agent status (health + gateway info)
   */
  async getAgentStatus(id: string): Promise<any> {
    const agent = await this.getAgentById(id);
    if (!agent) {
      throw new Error(`Agent ${id} not found`);
    }

    const agentObj: Agent = {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      description: agent.description,
      gateway: agent.gateway,
      capabilities: agent.capabilities
    };

    const { health, gatewayStatus } = await this.gatewayService.getDetailedStatus(agentObj);

    return {
      agent: agentObj,
      health,
      gatewayStatus
    };
  }

  /**
   * Get status of all agents
   */
  async getAllAgentsStatus(): Promise<any[]> {
    const agents = await this.getAllAgents();

    const statuses = await Promise.all(
      agents.map(async (agent) => {
        const agentObj: Agent = {
          id: agent.id,
          name: agent.name,
          role: agent.role,
          description: agent.description,
          gateway: agent.gateway,
          capabilities: agent.capabilities
        };

        const health = await this.gatewayService.checkHealth(agentObj);

        return {
          id: agent.id,
          name: agent.name,
          role: agent.role,
          health: health.status,
          url: agent.gateway.url
        };
      })
    );

    return statuses;
  }

  /**
   * Call gateway RPC method
   */
  async callGateway(id: string, method: string, params: any = {}): Promise<any> {
    const agent = await this.getAgentById(id);
    if (!agent) {
      throw new Error(`Agent ${id} not found`);
    }

    const agentObj: Agent = {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      description: agent.description,
      gateway: agent.gateway,
      capabilities: agent.capabilities
    };

    return await this.gatewayService.callGateway(agentObj, method, params);
  }

  /**
   * Send chat message to agent and get response
   */
  async chatWithAgent(id: string, request: ChatRequest): Promise<ChatResponse> {
    try {
      // Check if OpenClawGatewayService is available
      if (!this.openclawGatewayService) {
        return {
          ok: false,
          error: 'OpenClawGatewayService not available. Agent chat requires proper gateway connection.'
        };
      }

      // Verify agent exists
      const agent = await this.getAgentById(id);
      if (!agent) {
        return {
          ok: false,
          error: `Agent '${id}' not found`
        };
      }

      // Check if agent is connected
      const connectionStatus = this.openclawGatewayService.getConnectionStatus(id);
      if (connectionStatus !== 'connected') {
        return {
          ok: false,
          error: `Agent '${id}' is not connected (status: ${connectionStatus})`
        };
      }

      // Send chat message and wait for response
      console.log(`[AgentService] Sending chat message to ${id}:`, request.message.slice(0, 100));
      
      const result = await this.openclawGatewayService.sendChatMessage(
        id,
        request.message,
        {
          sessionKey: request.sessionKey,
          deliver: request.deliver,
          thinking: request.thinking,
          timeoutSeconds: request.timeoutSeconds
        }
      );

      return {
        ok: true,
        reply: result.reply,
        sessionKey: result.sessionKey,
        messageId: result.messageId
      };

    } catch (error: any) {
      console.error(`[AgentService] Chat error for agent ${id}:`, error);
      return {
        ok: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate TUI token for WebSocket access
   */
  async generateTUIToken(id: string): Promise<TUITokenResponse> {
    try {
      // Verify agent exists
      const agent = await this.getAgentById(id);
      if (!agent) {
        return {
          ok: false,
          error: `Agent '${id}' not found`
        };
      }

      // Extract port from gateway URL (ws://127.0.0.1:PORT)
      const urlMatch = agent.gateway.url.match(/:(\d+)/);
      if (!urlMatch) {
        return {
          ok: false,
          error: 'Invalid gateway URL format'
        };
      }
      const port = urlMatch[1];

      // Generate temporary token (valid for 10 minutes)
      // TODO: Implement proper token storage with expiration in Redis/database
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // For now, we'll use the existing gateway token
      const token = agent.gateway.token;

      // Construct WebSocket URL (accessible from browser via localhost)
      const wsUrl = `ws://127.0.0.1:${port}`;

      // Command for fallback (copy-paste)
      const command = `openclaw tui --url ${wsUrl} --token ${token}`;

      return {
        ok: true,
        token,
        wsUrl,
        command,
        expiresAt
      };

    } catch (error: any) {
      console.error(`[AgentService] TUI token generation error for agent ${id}:`, error);
      return {
        ok: false,
        error: error.message || 'Failed to generate TUI token'
      };
    }
  }

  /**
   * Verify Telegram bot token with Telegram API
   */
  private async verifyTelegramToken(token: string): Promise<{ username?: string } | null> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data: any = await response.json();

      if (!data.ok) {
        throw new Error(data.description || 'Invalid Telegram token');
      }

      return {
        username: data.result?.username
      };
    } catch (error: any) {
      throw new Error(`Failed to verify Telegram token: ${error.message}`);
    }
  }
}
