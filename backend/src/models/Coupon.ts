import mongoose, { Schema, Document } from 'mongoose';

export interface ICouponDocument extends Document {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  validFrom: Date;
  validUntil: Date;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  restaurant?: mongoose.Types.ObjectId;
}

const couponSchema = new Schema<ICouponDocument>({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Discount cannot be negative']
  },
  minOrderAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  maxDiscount: {
    type: Number,
    min: 0
  },
  validFrom: {
    type: Date,
    required: true
  },
  validUntil: {
    type: Date,
    required: true
  },
  usageLimit: {
    type: Number,
    default: -1 // -1 means unlimited
  },
  usedCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  restaurant: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant'
  }
}, {
  timestamps: true
});

// Indexes
couponSchema.index({ code: 1, isActive: 1 });

export const Coupon = mongoose.model<ICouponDocument>('Coupon', couponSchema);
