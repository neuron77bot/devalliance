import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description: string;
  assignedTo?: string; // agentId
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    assignedTo: { type: String, ref: 'Agent' },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'failed'],
      default: 'pending'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    result: { type: Schema.Types.Mixed },
    error: { type: String }
  },
  {
    timestamps: true,
    collection: 'tasks'
  }
);

TaskSchema.index({ status: 1, priority: -1 });
TaskSchema.index({ assignedTo: 1 });

export const TaskModel = mongoose.model<ITask>('Task', TaskSchema);
