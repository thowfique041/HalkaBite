import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemAuditLogDocument extends Document {
  actor?: mongoose.Types.ObjectId;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  method: string;
  path: string;
  statusCode: number;
  success: boolean;
  ip: string;
  browser: string;
  device: string;
  durationMs: number;
  createdAt: Date;
}

const schema = new Schema<ISystemAuditLogDocument>({
  actor: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  actorName: { type: String, trim: true },
  actorEmail: { type: String, trim: true, lowercase: true },
  actorRole: { type: String, trim: true, index: true },
  action: { type: String, required: true, index: true },
  method: { type: String, required: true, index: true },
  path: { type: String, required: true },
  statusCode: { type: Number, required: true },
  success: { type: Boolean, required: true, index: true },
  ip: { type: String, default: 'Unknown' },
  browser: { type: String, default: 'Other browser' },
  device: { type: String, default: 'Unknown device' },
  durationMs: { type: Number, default: 0 }
}, { timestamps: true });

schema.index({ createdAt: -1 });
schema.index({ actor: 1, createdAt: -1 });
schema.index({ success: 1, createdAt: -1 });

export const SystemAuditLog = mongoose.model<ISystemAuditLogDocument>('SystemAuditLog', schema);
