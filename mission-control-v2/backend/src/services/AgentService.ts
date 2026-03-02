import { AgentModel, IAgent } from '../models/Agent.model';
import { Agent } from '../schemas/agent.schema';
import { GatewayService } from './GatewayService';

export class AgentService {
  private gatewayService: GatewayService;

  constructor() {
    this.gatewayService = new GatewayService();
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
   * Initialize agents from config file
   */
  async initializeFromConfig(agents: Agent[]): Promise<void> {
    for (const agent of agents) {
      await this.upsertAgent(agent);
    }
  }
}
