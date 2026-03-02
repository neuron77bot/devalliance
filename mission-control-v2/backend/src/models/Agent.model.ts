import mongoose, { Schema, Document } from 'mongoose';

export interface IAgent extends Document {
  id: string;
  name: string;
  role: string;
  description: string;
  gateway: {
    url: string;
    token: string;
    healthUrl: string;
  };
  capabilities: string[];
  createdAt: Date;
  updatedAt: Date;
}

const AgentSchema = new Schema<IAgent>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    description: { type: String, required: true },
    gateway: {
      url: { type: String, required: true },
      token: { type: String, required: true },
      healthUrl: { type: String, required: true }
    },
    capabilities: [{ type: String }]
  },
  {
    timestamps: true,
    collection: 'agents'
  }
);

export const AgentModel = mongoose.model<IAgent>('Agent', AgentSchema);
