import { TaskModel, ITask, TaskStatus } from '../models/Task.model';
import { InteractionService } from './InteractionService';
import { QueueService } from './QueueService';
import { OpenClawGatewayService } from './OpenClawGatewayService';
import { AgentOutputModel } from '../models/AgentOutput.model';
import { EventEmitter } from 'events';

export interface TaskStateMachineTransitions {
  [key: string]: TaskStatus[];
}

export class TaskService extends EventEmitter {
  private interactionService: InteractionService;
  private queueService: QueueService;
  private gatewayService?: OpenClawGatewayService;

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

  constructor(gatewayService?: OpenClawGatewayService) {
    super();
    this.interactionService = new InteractionService();
    this.queueService = new QueueService();
    this.gatewayService = gatewayService;
  }

  /**
   * Set gateway service (for lazy initialization)
   */
  setGatewayService(gatewayService: OpenClawGatewayService): void {
    this.gatewayService = gatewayService;
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
   * Execute task on OpenClaw agent
   */
  async executeTask(taskId: string): Promise<any> {
    const task = await TaskModel.findById(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (!task.assignedTo) {
      throw new Error(`Task ${taskId} is not assigned to any agent`);
    }

    if (!this.gatewayService) {
      throw new Error('Gateway service not initialized');
    }

    // Check if agent is connected
    const status = this.gatewayService.getConnectionStatus(task.assignedTo);
    if (status !== 'connected') {
      throw new Error(`Agent ${task.assignedTo} is not connected (status: ${status})`);
    }

    // Build task prompt
    const prompt = this.buildTaskPrompt(task);

    // Log output: Starting execution
    await this.logOutput(task.assignedTo, taskId, 'output', '🚀 Starting task execution...');

    try {
      // Change status to in_progress
      await this.changeStatus(taskId, 'in_progress', task.assignedTo);

      // Send task to OpenClaw via RPC (chat.send)
      const result = await this.gatewayService.sendRPC(
        task.assignedTo,
        'chat.send',
        {
          message: prompt,
          sessionKey: 'agent:main:main', // Target main session
          idempotencyKey: `task-${taskId}-${Date.now()}` // Unique key for deduplication
        }
      );

      // Log the result
      await this.logOutput(task.assignedTo, taskId, 'result', JSON.stringify(result, null, 2));

      // Emit event for real-time updates
      this.emit('task:output', {
        taskId,
        agentId: task.assignedTo,
        type: 'result',
        content: result
      });

      return result;

    } catch (error: any) {
      // Log error
      await this.logOutput(task.assignedTo, taskId, 'error', `❌ Execution error: ${error.message}`);

      // Update task status to failed
      await this.changeStatus(taskId, 'failed', task.assignedTo);

      throw error;
    }
  }

  /**
   * Cancel task execution
   */
  async cancelTask(taskId: string, agentId?: string): Promise<any> {
    const task = await TaskModel.findById(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Change status to cancelled
    await this.changeStatus(taskId, 'cancelled', agentId);

    // Log cancellation
    await this.logOutput(
      task.assignedTo || 'system',
      taskId,
      'output',
      '🛑 Task execution cancelled'
    );

    return task;
  }

  /**
   * Get task output logs
   */
  async getTaskOutput(taskId: string, limit: number = 100): Promise<any[]> {
    return await AgentOutputModel.find({ taskId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get agent output logs
   */
  async getAgentOutput(agentId: string, limit: number = 100): Promise<any[]> {
    return await AgentOutputModel.find({ agentId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Handle task result from OpenClaw
   */
  async handleTaskResult(taskId: string, result: any): Promise<void> {
    const task = await TaskModel.findById(taskId);
    if (!task) return;

    try {
      // Log result
      await this.logOutput(
        task.assignedTo || 'system',
        taskId,
        'result',
        typeof result === 'string' ? result : JSON.stringify(result, null, 2)
      );

      // Mark as completed
      await this.changeStatus(taskId, 'completed', task.assignedTo);

      console.log(`[TaskService] ✅ Task ${taskId} completed successfully`);

    } catch (error: any) {
      console.error(`[TaskService] Failed to handle task result for ${taskId}:`, error.message);
    }
  }

  /**
   * Handle callback from agent skill (devalliance-notify)
   */
  async handleCallback(
    taskId: string,
    agentToken: string,
    callbackStatus: 'started' | 'completed' | 'failed',
    result?: string,
    error?: string
  ): Promise<any | null> {
    // Get task
    const task = await TaskModel.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Validate agent token matches assigned agent
    if (task.assignedTo !== agentToken) {
      throw new Error(
        `Agent token mismatch. Task assigned to: ${task.assignedTo}, callback from: ${agentToken}`
      );
    }

    // Map callback status to task status
    let newTaskStatus: TaskStatus;
    switch (callbackStatus) {
      case 'started':
        newTaskStatus = 'in_progress';
        break;
      case 'completed':
        newTaskStatus = 'completed';
        break;
      case 'failed':
        newTaskStatus = 'failed';
        break;
      default:
        throw new Error(`Invalid callback status: ${callbackStatus}`);
    }

    // Change status
    const updatedTask = await this.changeStatus(taskId, newTaskStatus, agentToken);
    if (!updatedTask) {
      throw new Error('Failed to update task status');
    }

    // Add comment with result/error
    if (result && callbackStatus === 'completed') {
      await this.addComment(taskId, agentToken, `✅ Task completed: ${result}`);
    } else if (error && callbackStatus === 'failed') {
      await this.addComment(taskId, agentToken, `❌ Task failed: ${error}`);
    } else if (callbackStatus === 'started') {
      await this.addComment(taskId, agentToken, `⏳ Task execution started`);
    }

    // Log to AgentOutput
    await this.logOutput(
      agentToken,
      taskId,
      callbackStatus === 'completed' ? 'result' : callbackStatus === 'failed' ? 'error' : 'progress',
      result || error || 'Task started',
      { callbackStatus, timestamp: new Date().toISOString() }
    );

    return updatedTask;
  }

  /**
   * Build task prompt for OpenClaw
   */
  private buildTaskPrompt(task: ITask): string {
    const lines = [
      `Task ID: ${task._id}`,
      `Title: ${task.title}`,
      `Description: ${task.description}`,
      `Priority: ${task.priority}`,
      `Estimated Duration: ${task.estimatedDuration || 'N/A'} minutes`,
      ``,
      `Please execute this task and report back when completed.`,
      `Include any code, files created, or actions taken.`
    ];

    if (task.tags && task.tags.length > 0) {
      lines.push(`Tags: ${task.tags.join(', ')}`);
    }

    if (task.metadata && Object.keys(task.metadata).length > 0) {
      lines.push(`\nAdditional Context:`);
      lines.push(JSON.stringify(task.metadata, null, 2));
    }

    return lines.join('\n');
  }

  /**
   * Log output to database
   */
  private async logOutput(
    agentId: string,
    taskId: string,
    type: 'output' | 'progress' | 'tool_call' | 'error' | 'result',
    content: string,
    metadata?: any
  ): Promise<void> {
    try {
      const output = new AgentOutputModel({
        agentId,
        taskId,
        type,
        content,
        metadata
      });

      await output.save();

      // Emit event for real-time updates
      this.emit('task:output', {
        taskId,
        agentId,
        type,
        content,
        metadata,
        timestamp: output.timestamp
      });

    } catch (error) {
      console.error('[TaskService] Failed to log output:', error);
    }
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
