import mongoose, { Schema, Document } from 'mongoose';

export interface ITeam extends Document {
  name: string;
  description: string;
  agentIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    agentIds: [{ type: String, ref: 'Agent' }]
  },
  {
    timestamps: true,
    collection: 'teams'
  }
);

export const TeamModel = mongoose.model<ITeam>('Team', TeamSchema);
