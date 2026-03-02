import { TaskModel, ITask, TaskStatus } from '../models/Task.model';
import { InteractionService } from './InteractionService';
import { QueueService } from './QueueService';

export interface TaskStateMachineTransitions {
  [key: string]: TaskStatus[];
}

export class TaskService {
  private interactionService: InteractionService;
  private queueService: QueueService;

  // Valid state transitions
  private readonly stateTransitions: TaskStateMachineTransitions = {
    pending: ['assigned', 'cancelled'],
    assigned: ['in_progress', 'pending', 'cancelled'],
    in_progress: ['paused', 'completed', 'failed', 'cancelled'],
    paused: ['in_progress', 'cancelled'],
    completed: [], // terminal state
    failed: ['pending', 'cancelled'], // can retry
    cancelled: [] // terminal state
  };

  constructor() {
    this.interactionService = new InteractionService();
    this.queueService = new QueueService();
  }

  /**
   * Create a new task with optional auto-assignment
   */
  async createTask(taskData: Partial<ITask> & { autoAssign?: boolean }): Promise<any> {
    const { autoAssign, ...data } = taskData;

    const task = new TaskModel({
      ...data,
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      tags: data.tags || [],
      dependencies: data.dependencies || [],
      metadata: data.metadata || {}
    });

    const savedTask = await task.save();

    // Auto-assign if requested and no explicit assignment
    if (autoAssign && !savedTask.assignedTo) {
      const assignedAgent = await this.queueService.autoAssignTask(savedTask._id.toString());
      if (assignedAgent) {
        await this.interactionService.logAssignment(
          savedTask._id.toString(),
          assignedAgent,
          data.createdBy
        );
        return (await TaskModel.findById(savedTask._id).lean())!;
      }
    }

    return savedTask.toObject();
  }

  /**
   * Get all tasks with optional filters
   */
  async getAllTasks(filter?: any): Promise<any[]> {
    const query = this.buildQuery(filter);
    const limit = filter?.limit || 50;
    const skip = filter?.skip || 0;

    return await TaskModel.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
  }

  /**
   * Get task by ID
   */
  async getTaskById(id: string): Promise<any | null> {
    return await TaskModel.findById(id).lean();
  }

  /**
   * Update task (with validation)
   */
  async updateTask(id: string, update: Partial<ITask>): Promise<any | null> {
    // Don't allow direct status updates via this method (use changeStatus instead)
    const { status, ...safeUpdate } = update;

    return await TaskModel.findByIdAndUpdate(id, safeUpdate, { new: true }).lean();
  }

  /**
   * Delete task
   */
  async deleteTask(id: string): Promise<boolean> {
    const result = await TaskModel.findByIdAndDelete(id);
    return !!result;
  }

  /**
   * Get tasks by agent
   */
  async getTasksByAgent(agentId: string): Promise<any[]> {
    return await TaskModel.find({ assignedTo: agentId })
      .sort({ priority: -1, createdAt: -1 })
      .lean();
  }

  /**
   * Change task status (with workflow validation)
   */
  async changeStatus(
    taskId: string,
    newStatus: TaskStatus,
    agent?: string,
    _reason?: string
  ): Promise<any | null> {
    const task = await TaskModel.findById(taskId);
    if (!task) return null;

    const currentStatus = task.status;

    // Validate state transition
    if (!this.isValidTransition(currentStatus, newStatus)) {
      throw new Error(
        `Invalid state transition from ${currentStatus} to ${newStatus}. ` +
        `Valid transitions: ${this.stateTransitions[currentStatus].join(', ')}`
      );
    }

    // Update timestamps based on new status
    const updates: any = { status: newStatus };

    if (newStatus === 'in_progress' && !task.startedAt) {
      updates.startedAt = new Date();
    }

    if (newStatus === 'completed' || newStatus === 'failed') {
      updates.completedAt = new Date();
      
      // Calculate actual duration if we have startedAt
      if (task.startedAt) {
        const durationMs = new Date().getTime() - new Date(task.startedAt).getTime();
        updates.actualDuration = Math.round(durationMs / 60000); // convert to minutes
      }
    }

    const updatedTask = await TaskModel.findByIdAndUpdate(taskId, updates, { new: true });

    // Log status change
    await this.interactionService.logStatusChange(taskId, currentStatus, newStatus, agent);

    // Trigger hooks
    await this.onStatusChange(updatedTask!, currentStatus, newStatus);

    return updatedTask;
  }

  /**
   * Assign task to agent
   */
  async assignTask(taskId: string, agentId: string, assignedBy?: string): Promise<any | null> {
    const task = await TaskModel.findByIdAndUpdate(
      taskId,
      { 
        assignedTo: agentId,
        status: 'assigned'
      },
      { new: true }
    );

    if (task) {
      await this.interactionService.logAssignment(taskId, agentId, assignedBy);
    }

    return task;
  }

  /**
   * Handoff task to another agent
   */
  async handoffTask(
    taskId: string,
    fromAgent: string,
    toAgent: string,
    message?: string
  ): Promise<{ task: any; interaction: any }> {
    const task = await TaskModel.findById(taskId);
    if (!task) throw new Error('Task not found');

    // Create handoff request interaction
    const interaction = await this.interactionService.createHandoffRequest(
      taskId,
      fromAgent,
      toAgent,
      message
    );

    // Update task: reset to pending and unassign
    const updatedTask = await TaskModel.findByIdAndUpdate(
      taskId,
      {
        status: 'pending',
        assignedTo: undefined
      },
      { new: true }
    )!;

    return { task: updatedTask!, interaction };
  }

  /**
   * Accept handoff
   */
  async acceptHandoff(taskId: string, agentId: string): Promise<any | null> {
    const task = await this.assignTask(taskId, agentId);
    
    if (task) {
      await this.interactionService.acceptHandoff(taskId, agentId, agentId);
    }

    return task;
  }

  /**
   * Add comment to task
   */
  async addComment(taskId: string, fromAgent: string, message: string): Promise<any> {
    return await this.interactionService.addComment(taskId, fromAgent, message);
  }

  /**
   * Get task statistics
   */
  async getTaskStats(): Promise<any> {
    const [
      totalTasks,
      pendingCount,
      assignedCount,
      inProgressCount,
      pausedCount,
      completedCount,
      failedCount,
      cancelledCount,
      byPriority,
      avgCompletionTime
    ] = await Promise.all([
      TaskModel.countDocuments(),
      TaskModel.countDocuments({ status: 'pending' }),
      TaskModel.countDocuments({ status: 'assigned' }),
      TaskModel.countDocuments({ status: 'in_progress' }),
      TaskModel.countDocuments({ status: 'paused' }),
      TaskModel.countDocuments({ status: 'completed' }),
      TaskModel.countDocuments({ status: 'failed' }),
      TaskModel.countDocuments({ status: 'cancelled' }),
      this.getTaskCountByPriority(),
      this.getAverageCompletionTime()
    ]);

    return {
      total: totalTasks,
      byStatus: {
        pending: pendingCount,
        assigned: assignedCount,
        in_progress: inProgressCount,
        paused: pausedCount,
        completed: completedCount,
        failed: failedCount,
        cancelled: cancelledCount
      },
      byPriority,
      avgCompletionTime
    };
  }

  /**
   * Check if dependencies are completed
   */
  async areDependenciesCompleted(taskId: string): Promise<boolean> {
    const task = await TaskModel.findById(taskId);
    if (!task || !task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    const dependencies = await TaskModel.find({
      _id: { $in: task.dependencies }
    });

    return dependencies.every(dep => dep.status === 'completed');
  }

  /**
   * Private: Validate state transition
   */
  private isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
    return this.stateTransitions[from]?.includes(to) || false;
  }

  /**
   * Private: Build query from filters
   */
  private buildQuery(filter?: any): any {
    const query: any = {};

    if (filter?.status) query.status = filter.status;
    if (filter?.priority) query.priority = filter.priority;
    if (filter?.assignedTo) query.assignedTo = filter.assignedTo;
    if (filter?.tags && filter.tags.length > 0) {
      query.tags = { $in: filter.tags };
    }
    if (filter?.search) {
      query.$or = [
        { title: { $regex: filter.search, $options: 'i' } },
        { description: { $regex: filter.search, $options: 'i' } }
      ];
    }

    return query;
  }

  /**
   * Private: Get task count by priority
   */
  private async getTaskCountByPriority(): Promise<any> {
    const result = await TaskModel.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    return result.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
  }

  /**
   * Private: Get average completion time
   */
  private async getAverageCompletionTime(): Promise<number | null> {
    const completedTasks = await TaskModel.find({
      status: 'completed',
      actualDuration: { $exists: true, $ne: null }
    }).select('actualDuration');

    if (completedTasks.length === 0) return null;

    const total = completedTasks.reduce((sum, task) => sum + (task.actualDuration || 0), 0);
    return Math.round(total / completedTasks.length);
  }

  /**
   * Private: Hook for status changes
   */
  private async onStatusChange(task: ITask, _oldStatus: TaskStatus, newStatus: TaskStatus): Promise<void> {
    // Check if this task completion unblocks other tasks
    if (newStatus === 'completed') {
      const blockedTasks = await TaskModel.find({
        dependencies: task._id.toString(),
        status: 'pending'
      });

      for (const blockedTask of blockedTasks) {
        const allDepsCompleted = await this.areDependenciesCompleted(blockedTask._id.toString());
        if (allDepsCompleted) {
          // Auto-assign now that dependencies are met
          await this.queueService.autoAssignTask(blockedTask._id.toString());
        }
      }
    }
  }
}
