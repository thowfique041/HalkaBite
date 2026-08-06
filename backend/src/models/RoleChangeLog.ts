import mongoose, { Document, Schema } from 'mongoose';

type UserRole = 'user' | 'admin' | 'restaurant' | 'delivery';

export interface IRoleChangeLogDocument extends Document {
  adminId: mongoose.Types.ObjectId;
  adminName: string;
  userId: mongoose.Types.ObjectId;
  userName: string;
  previousRole: UserRole;
  newRole: UserRole;
  changedAt: Date;
}

const roleChangeLogSchema = new Schema<IRoleChangeLogDocument>({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  adminName: { type: String, required: true, immutable: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  userName: { type: String, required: true, immutable: true },
  previousRole: { type: String, enum: ['user', 'admin', 'restaurant', 'delivery'], required: true, immutable: true },
  newRole: { type: String, enum: ['user', 'admin', 'restaurant', 'delivery'], required: true, immutable: true },
  changedAt: { type: Date, required: true, default: Date.now, immutable: true }
}, { versionKey: false });

roleChangeLogSchema.index({ userId: 1, changedAt: -1 });
roleChangeLogSchema.index({ adminId: 1, changedAt: -1 });

export const RoleChangeLog = mongoose.model<IRoleChangeLogDocument>('RoleChangeLog', roleChangeLogSchema);
