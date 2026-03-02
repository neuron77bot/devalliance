import { OpenClawGatewayService } from './OpenClawGatewayService';
import { DockerService } from './DockerService';
import { AgentModel } from '../models/Agent.model';
import { EventEmitter } from 'events';

export interface AgentStatus {
  agentId: string;
  status: 'healthy' | 'offline' | 'error';
  containerRunning: boolean;
  gatewayConnected: boolean;
  metrics?: {
    cpu?: number;
    memory?: number;
    uptime?: number;
  };
  responseTime?: number;
  lastSync: Date;
}

export class StatusSyncService extends EventEmitter {
  private gatewayService: OpenClawGatewayService;
  private dockerService: DockerService;
  private syncInterval?: NodeJS.Timeout;
  private readonly DEFAULT_SYNC_INTERVAL = 30000; // 30 seconds

  constructor(
    gatewayService: OpenClawGatewayService,
    dockerService: DockerService
  ) {
    super();
    this.gatewayService = gatewayService;
    this.dockerService = dockerService;
  }

  /**
   * Start periodic status synchronization
   */
  startPeriodicSync(intervalMs: number = this.DEFAULT_SYNC_INTERVAL): void {
    if (this.syncInterval) {
      console.log('[StatusSync] Already running, stopping previous interval');
      this.stopPeriodicSync();
    }

    console.log(`[StatusSync] Starting periodic sync (interval: ${intervalMs}ms)`);
    
    // Initial sync
    this.syncAllAgents();

    // Set up interval
    this.syncInterval = setInterval(() => {
      this.syncAllAgents();
    }, intervalMs);
  }

  /**
   * Stop periodic status synchronization
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      console.log('[StatusSync] Stopping periodic sync');
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
  }

  /**
   * Sync status for all agents
   */
  async syncAllAgents(): Promise<void> {
    try {
      const agents = await AgentModel.find({});
      console.log(`[StatusSync] Syncing ${agents.length} agents...`);

      const results = await Promise.allSettled(
        agents.map(agent => this.syncAgent(agent.id))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`[StatusSync] Sync complete: ${successful} successful, ${failed} failed`);

    } catch (error) {
      console.error('[StatusSync] Failed to sync agents:', error);
    }
  }

  /**
   * Sync status for a single agent
   */
  async syncAgent(agentId: string): Promise<AgentStatus> {
    const startTime = Date.now();
    
    try {
      // Get container status
      const containerRunning = await this.isContainerRunning(agentId);
      
      // Get gateway connection status
      const gatewayStatus = this.gatewayService.getConnectionStatus(agentId);
      const gatewayConnected = gatewayStatus === 'connected';

      // Determine overall status
      let status: 'healthy' | 'offline' | 'error';
      if (!containerRunning) {
        status = 'offline';
      } else if (!gatewayConnected) {
        status = 'error';
      } else {
        status = 'healthy';
      }

      // Get metrics if healthy
      let metrics;
      if (status === 'healthy') {
        metrics = await this.getContainerStats(agentId);
      }

      // Calculate response time
      const responseTime = Date.now() - startTime;

      const agentStatus: AgentStatus = {
        agentId,
        status,
        containerRunning,
        gatewayConnected,
        metrics,
        responseTime,
        lastSync: new Date()
      };

      // Update agent in database
      await AgentModel.findOneAndUpdate(
        { agentId },
        {
          status: status === 'healthy' ? 'active' : status === 'offline' ? 'inactive' : 'error',
          lastSeen: new Date(),
          'metadata.containerRunning': containerRunning,
          'metadata.gatewayConnected': gatewayConnected,
          'metadata.responseTime': responseTime
        }
      );

      // Emit status update event
      this.emit('agent:status', agentStatus);

      return agentStatus;

    } catch (error: any) {
      console.error(`[StatusSync] Failed to sync agent ${agentId}:`, error.message);
      
      const errorStatus: AgentStatus = {
        agentId,
        status: 'error',
        containerRunning: false,
        gatewayConnected: false,
        lastSync: new Date()
      };

      this.emit('agent:status', errorStatus);
      return errorStatus;
    }
  }

  /**
   * Check if container is running
   */
  async isContainerRunning(agentId: string): Promise<boolean> {
    try {
      const status = await this.dockerService.getContainerStatus(agentId);
      return status.running;
    } catch (error) {
      console.error(`[StatusSync] Failed to check container status for ${agentId}:`, error);
      return false;
    }
  }

  /**
   * Get container stats (CPU, memory, uptime)
   * Note: Simplified version - full stats require Docker API integration
   */
  async getContainerStats(agentId: string): Promise<any> {
    try {
      const status = await this.dockerService.getContainerStatus(agentId);
      
      if (!status.running) {
        return null;
      }

      // For now, return basic stats
      // TODO: Integrate with Docker API for real CPU/memory stats
      return {
        cpu: 0,
        memory: 0,
        uptime: 0
      };

    } catch (error) {
      console.error(`[StatusSync] Failed to get container stats for ${agentId}:`, error);
      return null;
    }
  }

  /**
   * Force reconnect for an agent
   */
  async forceReconnect(agentId: string): Promise<void> {
    console.log(`[StatusSync] Force reconnecting agent ${agentId}...`);
    
    try {
      // Disconnect first
      await this.gatewayService.disconnectAgent(agentId);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reconnect
      await this.gatewayService.connectAgent(agentId);
      
      // Sync status
      await this.syncAgent(agentId);
      
      console.log(`[StatusSync] ✅ Agent ${agentId} reconnected`);
      
    } catch (error: any) {
      console.error(`[StatusSync] Failed to reconnect agent ${agentId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get current status for an agent
   */
  async getCurrentStatus(agentId: string): Promise<AgentStatus> {
    return await this.syncAgent(agentId);
  }

  /**
   * Get status for all agents
   */
  async getAllStatuses(): Promise<AgentStatus[]> {
    const agents = await AgentModel.find({});
    const statuses = await Promise.all(
      agents.map(agent => this.syncAgent(agent.id))
    );
    return statuses;
  }
}
