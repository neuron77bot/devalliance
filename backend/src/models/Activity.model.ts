import mongoose, { Schema, Document } from 'mongoose';

export type ActivityType = 
  | 'agent_started'
  | 'agent_stopped'
  | 'agent_error'
  | 'task_created'
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'system_event';

export interface IActivity extends Document {
  type: ActivityType;
  agentId?: string;
  taskId?: string;
  message: string;
  metadata?: any;
  level: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    type: {
      type: String,
      required: true,
      enum: [
        'agent_started',
        'agent_stopped',
        'agent_error',
        'task_created',
        'task_started',
        'task_completed',
        'task_failed',
        'system_event'
      ]
    },
    agentId: { type: String, ref: 'Agent' },
    taskId: { type: String, ref: 'Task' },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    level: {
      type: String,
      enum: ['info', 'warning', 'error', 'success'],
      default: 'info'
    },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  {
    collection: 'activities'
  }
);

// Index para búsqueda eficiente
ActivitySchema.index({ timestamp: -1 });
ActivitySchema.index({ agentId: 1, timestamp: -1 });
ActivitySchema.index({ type: 1, timestamp: -1 });

// TTL index - eliminar actividades después de 30 días
ActivitySchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

export const ActivityModel = mongoose.model<IActivity>('Activity', ActivitySchema);
