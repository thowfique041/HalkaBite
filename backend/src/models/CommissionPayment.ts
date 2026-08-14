import mongoose, { Document, Schema } from 'mongoose';

export type CommissionPaymentMethod = 'cash' | 'bkash' | 'nagad' | 'rocket' | 'bank_transfer' | 'other';
export type CommissionPaymentStatus = 'verified';

export interface ICommissionPaymentDocument extends Document {
  paymentId: string;
  restaurantId: mongoose.Types.ObjectId;
  amount: number;
  paymentMethod: CommissionPaymentMethod;
  referenceId?: string;
  paymentDate: Date;
  status: CommissionPaymentStatus;
  previousDue: number;
  remainingDue: number;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ICommissionPaymentDocument>({
  paymentId: { type: String, required: true, unique: true, immutable: true, trim: true },
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, immutable: true, index: true },
  amount: { type: Number, required: true, min: 0.01, immutable: true },
  paymentMethod: { type: String, enum: ['cash', 'bkash', 'nagad', 'rocket', 'bank_transfer', 'other'], required: true, immutable: true },
  referenceId: { type: String, trim: true, uppercase: true, maxlength: 100, immutable: true },
  paymentDate: { type: Date, required: true, immutable: true, index: true },
  status: { type: String, enum: ['verified'], default: 'verified', immutable: true, index: true },
  previousDue: { type: Number, required: true, min: 0, immutable: true },
  remainingDue: { type: Number, required: true, min: 0, immutable: true },
  notes: { type: String, trim: true, maxlength: 1000, immutable: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true }
}, { timestamps: true });

schema.index({ restaurantId: 1, paymentDate: -1 });
schema.index(
  { referenceId: 1 },
  { unique: true, partialFilterExpression: { referenceId: { $type: 'string' } } }
);

export const CommissionPayment = mongoose.model<ICommissionPaymentDocument>('CommissionPayment', schema);
