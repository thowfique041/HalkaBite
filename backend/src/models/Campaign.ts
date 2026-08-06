import mongoose, { Document, Schema } from 'mongoose';

export interface ICampaignDocument extends Document {
  restaurant: mongoose.Types.ObjectId; name: string; promotionLabel: string; description: string;
  discountType: 'percentage' | 'fixed'; discountValue: number; foodItems: mongoose.Types.ObjectId[];
  startAt: Date; endAt: Date; targetType: 'everyone' | 'selected' | 'eligibility';
  selectedCustomers: mongoose.Types.ObjectId[]; eligibleCustomers: mongoose.Types.ObjectId[];
  eligibility: { newCustomers?: boolean; returningCustomers?: boolean; vipCustomers?: boolean; fivePlusOrders?: boolean; inactiveThirtyDays?: boolean; minimumSpending?: number };
  status: 'scheduled' | 'active' | 'expired' | 'cancelled'; notifiedAt?: Date;
  metrics: { views: number; clicks: number; redemptions: number; revenueGenerated: number };
  usageHistory: Array<{ customer: mongoose.Types.ObjectId; order: mongoose.Types.ObjectId; discountAmount: number; revenue: number; usedAt: Date }>;
}

const campaignSchema = new Schema<ICampaignDocument>({
  restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 }, promotionLabel: { type: String, required: true, trim: true, maxlength: 50 },
  description: { type: String, required: true, trim: true, maxlength: 500 }, discountType: { type: String, enum: ['percentage','fixed'], required: true },
  discountValue: { type: Number, required: true, min: 0.01 }, foodItems: [{ type: Schema.Types.ObjectId, ref: 'FoodItem', required: true }],
  startAt: { type: Date, required: true, index: true }, endAt: { type: Date, required: true, index: true },
  targetType: { type: String, enum: ['everyone','selected','eligibility'], default: 'everyone' },
  selectedCustomers: [{ type: Schema.Types.ObjectId, ref: 'User' }], eligibleCustomers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  eligibility: { newCustomers: Boolean, returningCustomers: Boolean, vipCustomers: Boolean, fivePlusOrders: Boolean, inactiveThirtyDays: Boolean, minimumSpending: { type: Number, min: 0 } },
  status: { type: String, enum: ['scheduled','active','expired','cancelled'], default: 'scheduled', index: true }, notifiedAt: Date,
  metrics: { views: { type: Number, default: 0 }, clicks: { type: Number, default: 0 }, redemptions: { type: Number, default: 0 }, revenueGenerated: { type: Number, default: 0 } },
  usageHistory: [{ customer: { type: Schema.Types.ObjectId, ref: 'User' }, order: { type: Schema.Types.ObjectId, ref: 'Order' }, discountAmount: Number, revenue: Number, usedAt: { type: Date, default: Date.now } }]
}, { timestamps: true });
campaignSchema.index({ restaurant: 1, status: 1, startAt: -1 });
campaignSchema.pre('validate', function () { if (this.endAt <= this.startAt) this.invalidate('endAt', 'End time must be after start time'); if (this.discountType === 'percentage' && this.discountValue > 100) this.invalidate('discountValue', 'Percentage cannot exceed 100'); });
export const Campaign = mongoose.model<ICampaignDocument>('Campaign', campaignSchema);
