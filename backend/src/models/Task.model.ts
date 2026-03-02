import mongoose, { Schema, Document } from 'mongoose';

export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ITask extends Document {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo?: string; // agentId
  createdBy?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number; // minutes
  actualDuration?: number; // minutes
  tags: string[];
  dependencies: string[]; // task IDs
  metadata: {
    notes?: string;
    attachments?: string[];
  };
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'in_progress', 'paused', 'completed', 'failed', 'cancelled'],
      default: 'pending'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    assignedTo: { type: String, ref: 'Agent' },
    createdBy: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
    estimatedDuration: { type: Number },
    actualDuration: { type: Number },
    tags: [{ type: String }],
    dependencies: [{ type: String }],
    metadata: {
      notes: { type: String },
      attachments: [{ type: String }]
    }
  },
  {
    timestamps: true,
    collection: 'tasks'
  }
);

// Indexes for performance
TaskSchema.index({ status: 1, priority: -1, createdAt: -1 });
TaskSchema.index({ assignedTo: 1, status: 1 });
TaskSchema.index({ priority: -1 });
TaskSchema.index({ createdAt: -1 });

export const TaskModel = mongoose.model<ITask>('Task', TaskSchema);
