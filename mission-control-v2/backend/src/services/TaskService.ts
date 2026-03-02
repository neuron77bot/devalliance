import { TaskModel, ITask } from '../models/Task.model';

export class TaskService {
  /**
   * Create a new task
   */
  async createTask(taskData: Partial<ITask>): Promise<ITask> {
    const task = new TaskModel(taskData);
    return await task.save();
  }

  /**
   * Get all tasks
   */
  async getAllTasks(filter?: any): Promise<any[]> {
    return await TaskModel.find(filter || {}).sort({ createdAt: -1 }).lean();
  }

  /**
   * Get task by ID
   */
  async getTaskById(id: string): Promise<any | null> {
    return await TaskModel.findById(id).lean();
  }

  /**
   * Update task
   */
  async updateTask(id: string, update: Partial<ITask>): Promise<any | null> {
    return await TaskModel.findByIdAndUpdate(id, update, { new: true }).lean();
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
    return await TaskModel.find({ assignedTo: agentId }).sort({ createdAt: -1 }).lean();
  }
}
