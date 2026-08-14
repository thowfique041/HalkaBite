import mongoose, { Document, Schema } from 'mongoose';
import { CommissionMode, CommissionScope } from './CommissionSetting';
export interface ICommissionHistoryDocument extends Document {
  setting?: mongoose.Types.ObjectId; scope: CommissionScope; target?: string;
  oldMode?: CommissionMode; oldValue?: number; newMode: CommissionMode; newValue: number;
  changedBy: mongoose.Types.ObjectId; reason: string;
}
const schema = new Schema<ICommissionHistoryDocument>({
  setting: { type: Schema.Types.ObjectId, ref: 'CommissionSetting' },
  scope: { type: String, enum: ['global', 'restaurant', 'category', 'city'], required: true }, target: String,
  oldMode: { type: String, enum: ['percentage', 'fixed', 'none'] }, oldValue: Number,
  newMode: { type: String, enum: ['percentage', 'fixed', 'none'], required: true }, newValue: { type: Number, required: true, min: 0 },
  changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }, reason: { type: String, required: true, maxlength: 500 }
}, { timestamps: true });
schema.index({ createdAt: -1 }); schema.index({ scope: 1, target: 1, createdAt: -1 });
export const CommissionHistory = mongoose.model<ICommissionHistoryDocument>('CommissionHistory', schema);

