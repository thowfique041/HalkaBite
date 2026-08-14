import mongoose, { Document, Schema } from 'mongoose';

export type CommissionMode = 'percentage' | 'fixed' | 'none';
export type CommissionScope = 'global' | 'restaurant' | 'category' | 'city';

export interface ICommissionSettingDocument extends Document {
  mode: CommissionMode; value: number; scope: CommissionScope;
  restaurant?: mongoose.Types.ObjectId; category?: string; city?: string;
  isActive: boolean; updatedBy: mongoose.Types.ObjectId; reason: string;
}

const schema = new Schema<ICommissionSettingDocument>({
  mode: { type: String, enum: ['percentage', 'fixed', 'none'], required: true },
  value: { type: Number, required: true, min: 0 },
  scope: { type: String, enum: ['global', 'restaurant', 'category', 'city'], required: true },
  restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant' },
  category: { type: String, trim: true }, city: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true, trim: true, maxlength: 500 }
}, { timestamps: true });
schema.index({ scope: 1, restaurant: 1, category: 1, city: 1, isActive: 1 });
schema.index({ scope: 1 }, { unique: true, partialFilterExpression: { scope: 'global', isActive: true } });
schema.index({ restaurant: 1 }, { unique: true, partialFilterExpression: { scope: 'restaurant', isActive: true } });
export const CommissionSetting = mongoose.model<ICommissionSettingDocument>('CommissionSetting', schema);

