import { AgentModel, IAgent } from '../models/Agent.model';
import { Agent, CreateAgent, UpdateAgent } from '../schemas/agent.schema';
import { GatewayService } from './GatewayService';
import { DockerService } from './DockerService';
import * as fs from 'fs/promises';

export class AgentService {
  private gatewayService: GatewayService;
  private dockerService: DockerService;
  private readonly CONFIG_PATH = '/var/www/devalliance/backend/config/agents.json';

  constructor() {
    this.gatewayService = new GatewayService();
    this.dockerService = new DockerService();
  }

  /**
   * Get all agents from database
   */
  async getAllAgents(): Promise<any[]> {
    return await AgentModel.find().select('-__v').lean();
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

    // Create agent object
    const agent: Agent = {
      id,
      name: data.name,
      role: data.role,
      description: data.description,
      capabilities: data.capabilities || [],
      gateway: {
        url: `ws://openclaw-${id}:18789`,
        token: gatewayToken,
        healthUrl: `http://openclaw-${id}:18789/healthz`
      }
    };

    // Save to database
    await this.upsertAgent(agent);

    // Create Docker container
    try {
      await this.dockerService.ensureNetworkExists();
      await this.dockerService.createContainer({
        id,
        name: data.name,
        port,
        gatewayToken
      });
    } catch (error) {
      // Rollback: delete from database if container creation fails
      await AgentModel.deleteOne({ id });
      throw error;
    }

    // Update config file
    await this.updateConfigFile();

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

    // Update config file
    await this.updateConfigFile();

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

    // Update config file
    await this.updateConfigFile();
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
   * Update config/agents.json with current agents from database
   */
  private async updateConfigFile(): Promise<void> {
    try {
      const agents = await this.getAllAgents();
      const configData = {
        agents: agents.map((agent) => ({
          id: agent.id,
          name: agent.name,
          role: agent.role,
          description: agent.description,
          gateway: agent.gateway,
          capabilities: agent.capabilities
        }))
      };

      await fs.writeFile(
        this.CONFIG_PATH,
        JSON.stringify(configData, null, 2)
      );
    } catch (error) {
      console.error('Error updating config file:', error);
      // Don't throw - config file update is not critical
    }
  }

  /**
   * Initialize agents from config file
   */
  async initializeFromConfig(agents: Agent[]): Promise<void> {
    for (const agent of agents) {
      await this.upsertAgent(agent);
    }
  }
}
