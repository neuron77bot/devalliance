import { Schema, model, Document } from 'mongoose';

export type OutputType = 'output' | 'progress' | 'tool_call' | 'error' | 'result';

export interface IAgentOutput extends Document {
  agentId: string;
  taskId?: string;
  type: OutputType;
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

const AgentOutputSchema = new Schema<IAgentOutput>({
  agentId: {
    type: String,
    required: true,
    index: true
  },
  taskId: {
    type: String,
    index: true
  },
  type: {
    type: String,
    enum: ['output', 'progress', 'tool_call', 'error', 'result'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for efficient queries
AgentOutputSchema.index({ agentId: 1, timestamp: -1 });
AgentOutputSchema.index({ taskId: 1, timestamp: -1 });

export const AgentOutputModel = model<IAgentOutput>('AgentOutput', AgentOutputSchema);
