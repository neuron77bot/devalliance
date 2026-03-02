import { InteractionModel, IInteraction, InteractionType } from '../models/Interaction.model';

export interface CreateInteractionInput {
  taskId: string;
  type: InteractionType;
  fromAgent?: string;
  toAgent?: string;
  message?: string;
  metadata?: any;
}

export class InteractionService {
  /**
   * Create a new interaction
   */
  async createInteraction(data: CreateInteractionInput): Promise<IInteraction> {
    const interaction = new InteractionModel({
      ...data,
      timestamp: new Date()
    });
    return await interaction.save();
  }

  /**
   * Get all interactions for a task
   */
  async getTaskInteractions(taskId: string): Promise<any[]> {
    return await InteractionModel.find({ taskId })
      .sort({ timestamp: -1 })
      .lean();
  }

  /**
   * Get interactions by agent (sent or received)
   */
  async getAgentInteractions(agentId: string, limit = 50): Promise<any[]> {
    return await InteractionModel.find({
      $or: [
        { fromAgent: agentId },
        { toAgent: agentId }
      ]
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Add a comment to a task
   */
  async addComment(taskId: string, fromAgent: string, message: string): Promise<IInteraction> {
    return await this.createInteraction({
      taskId,
      type: 'comment',
      fromAgent,
      message
    });
  }

  /**
   * Create handoff request
   */
  async createHandoffRequest(
    taskId: string,
    fromAgent: string,
    toAgent: string,
    message?: string
  ): Promise<IInteraction> {
    return await this.createInteraction({
      taskId,
      type: 'handoff_request',
      fromAgent,
      toAgent,
      message
    });
  }

  /**
   * Accept handoff
   */
  async acceptHandoff(
    taskId: string,
    fromAgent: string,
    toAgent: string
  ): Promise<IInteraction> {
    return await this.createInteraction({
      taskId,
      type: 'handoff_accept',
      fromAgent,
      toAgent
    });
  }

  /**
   * Reject handoff
   */
  async rejectHandoff(
    taskId: string,
    fromAgent: string,
    toAgent: string,
    reason?: string
  ): Promise<IInteraction> {
    return await this.createInteraction({
      taskId,
      type: 'handoff_reject',
      fromAgent,
      toAgent,
      message: reason
    });
  }

  /**
   * Log status change
   */
  async logStatusChange(
    taskId: string,
    fromStatus: string,
    toStatus: string,
    agent?: string
  ): Promise<IInteraction> {
    return await this.createInteraction({
      taskId,
      type: 'status_change',
      fromAgent: agent,
      message: `Status changed from ${fromStatus} to ${toStatus}`,
      metadata: { fromStatus, toStatus }
    });
  }

  /**
   * Log assignment
   */
  async logAssignment(
    taskId: string,
    agentId: string,
    assignedBy?: string
  ): Promise<IInteraction> {
    return await this.createInteraction({
      taskId,
      type: 'assignment',
      fromAgent: assignedBy,
      toAgent: agentId,
      message: `Task assigned to ${agentId}`
    });
  }

  /**
   * Get interaction stats for a task
   */
  async getTaskInteractionStats(taskId: string): Promise<any> {
    const interactions = await this.getTaskInteractions(taskId);
    
    const stats = {
      total: interactions.length,
      byType: {} as Record<string, number>,
      participants: new Set<string>()
    };

    interactions.forEach(i => {
      stats.byType[i.type] = (stats.byType[i.type] || 0) + 1;
      if (i.fromAgent) stats.participants.add(i.fromAgent);
      if (i.toAgent) stats.participants.add(i.toAgent);
    });

    return {
      ...stats,
      participants: Array.from(stats.participants)
    };
  }
}
