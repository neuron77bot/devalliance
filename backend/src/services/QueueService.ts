import { TaskModel, ITask } from '../models/Task.model';
import { AgentModel } from '../models/Agent.model';

interface AgentWorkload {
  agentId: string;
  inProgressCount: number;
  assignedCount: number;
  totalLoad: number;
}

export class QueueService {
  private maxConcurrentTasksPerAgent = 3;
  private roundRobinIndex: Map<string, number> = new Map();

  /**
   * Get queue for a specific agent
   */
  async getAgentQueue(agentId: string): Promise<ITask[]> {
    const tasks = await TaskModel.find({
      assignedTo: agentId,
      status: { $in: ['pending', 'assigned', 'in_progress', 'paused'] }
    })
      .sort({ priority: -1, createdAt: 1 })
      .lean();

    return this.prioritizeTasks(tasks);
  }

  /**
   * Get agent workload stats
   */
  async getAgentWorkload(agentId: string): Promise<AgentWorkload> {
    const [inProgressCount, assignedCount] = await Promise.all([
      TaskModel.countDocuments({ assignedTo: agentId, status: 'in_progress' }),
      TaskModel.countDocuments({ assignedTo: agentId, status: 'assigned' })
    ]);

    return {
      agentId,
      inProgressCount,
      assignedCount,
      totalLoad: inProgressCount + assignedCount * 0.5 // in_progress weighs more
    };
  }

  /**
   * Auto-assign task to best available agent
   */
  async autoAssignTask(taskId: string, requiredCapabilities?: string[]): Promise<string | null> {
    const task = await TaskModel.findById(taskId);
    if (!task) return null;

    // Find available agents
    let agents = await AgentModel.find().lean();

    // Filter by required capabilities if specified
    if (requiredCapabilities && requiredCapabilities.length > 0) {
      agents = agents.filter(agent =>
        requiredCapabilities.every(cap => agent.capabilities.includes(cap))
      );
    }

    if (agents.length === 0) return null;

    // Get workload for all agents
    const workloads = await Promise.all(
      agents.map(agent => this.getAgentWorkload(agent.id))
    );

    // Filter agents that haven't reached max concurrent tasks
    const availableAgents = workloads.filter(
      w => w.inProgressCount < this.maxConcurrentTasksPerAgent
    );

    if (availableAgents.length === 0) {
      // All agents are at capacity, leave unassigned
      return null;
    }

    // Sort by load (ascending) and get agents with minimum load
    availableAgents.sort((a, b) => a.totalLoad - b.totalLoad);
    const minLoad = availableAgents[0].totalLoad;
    const leastLoadedAgents = availableAgents.filter(a => a.totalLoad === minLoad);

    // Round-robin among agents with same load
    let selectedAgent: string;
    if (leastLoadedAgents.length === 1) {
      selectedAgent = leastLoadedAgents[0].agentId;
    } else {
      const capKey = (requiredCapabilities || []).sort().join(',') || 'default';
      const currentIndex = this.roundRobinIndex.get(capKey) || 0;
      selectedAgent = leastLoadedAgents[currentIndex % leastLoadedAgents.length].agentId;
      this.roundRobinIndex.set(capKey, currentIndex + 1);
    }

    // Assign task
    await TaskModel.findByIdAndUpdate(taskId, {
      assignedTo: selectedAgent,
      status: 'assigned'
    });

    return selectedAgent;
  }

  /**
   * Prioritize tasks by priority and FIFO
   */
  private prioritizeTasks(tasks: any[]): any[] {
    const priorityWeight: Record<string, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1
    };

    return tasks.sort((a, b) => {
      const priorityDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (priorityDiff !== 0) return priorityDiff;

      // If same priority, FIFO (older first)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  /**
   * Get global queue statistics
   */
  async getQueueStats(): Promise<any> {
    const [totalPending, totalAssigned, totalInProgress, totalPaused] = await Promise.all([
      TaskModel.countDocuments({ status: 'pending' }),
      TaskModel.countDocuments({ status: 'assigned' }),
      TaskModel.countDocuments({ status: 'in_progress' }),
      TaskModel.countDocuments({ status: 'paused' })
    ]);

    const agents = await AgentModel.find().lean();
    const agentWorkloads = await Promise.all(
      agents.map(agent => this.getAgentWorkload(agent.id))
    );

    return {
      queue: {
        pending: totalPending,
        assigned: totalAssigned,
        inProgress: totalInProgress,
        paused: totalPaused,
        total: totalPending + totalAssigned + totalInProgress + totalPaused
      },
      agents: agentWorkloads.map(w => ({
        ...w,
        status: w.inProgressCount >= this.maxConcurrentTasksPerAgent ? 'overloaded' :
                w.inProgressCount > 0 ? 'busy' : 'available'
      }))
    };
  }

  /**
   * Rebalance tasks across agents (optional utility)
   */
  async rebalanceQueue(): Promise<void> {
    const unassignedTasks = await TaskModel.find({ 
      status: 'pending',
      assignedTo: { $exists: false }
    });

    for (const task of unassignedTasks) {
      await this.autoAssignTask(task._id.toString());
    }
  }
}
