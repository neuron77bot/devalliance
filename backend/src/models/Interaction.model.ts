import mongoose, { Schema, Document } from 'mongoose';

export type InteractionType = 
  | 'comment' 
  | 'handoff_request' 
  | 'handoff_accept' 
  | 'handoff_reject' 
  | 'status_change' 
  | 'assignment'
  | 'collaboration_invite'
  | 'collaboration_accept'
  | 'collaboration_reject';

export interface IInteraction extends Document {
  taskId: string;
  type: InteractionType;
  fromAgent?: string;
  toAgent?: string;
  message?: string;
  timestamp: Date;
  metadata?: any;
}

const InteractionSchema = new Schema<IInteraction>(
  {
    taskId: { type: String, required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        'comment',
        'handoff_request',
        'handoff_accept',
        'handoff_reject',
        'status_change',
        'assignment',
        'collaboration_invite',
        'collaboration_accept',
        'collaboration_reject'
      ]
    },
    fromAgent: { type: String, ref: 'Agent' },
    toAgent: { type: String, ref: 'Agent' },
    message: { type: String },
    timestamp: { type: Date, default: Date.now },
    metadata: { type: Schema.Types.Mixed }
  },
  {
    timestamps: false,
    collection: 'interactions'
  }
);

// Indexes
InteractionSchema.index({ taskId: 1, timestamp: -1 });
InteractionSchema.index({ fromAgent: 1 });
InteractionSchema.index({ toAgent: 1 });

export const InteractionModel = mongoose.model<IInteraction>('Interaction', InteractionSchema);
