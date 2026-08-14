import mongoose, { Document, Schema } from 'mongoose';

export type PaymentMethod = 'bkash' | 'nagad' | 'rocket' | 'cod';
export type ManualPaymentStatus = 'pending' | 'submitted' | 'verified' | 'rejected';

export interface IPaymentDocument extends Document {
  orderId: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  method: PaymentMethod;
  receiverNumber?: string;
  receiverAccountType?: 'Personal' | 'Agent';
  senderNumber?: string;
  transactionId?: string;
  amount: number;
  status: ManualPaymentStatus;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPaymentDocument>({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true, immutable: true },
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, immutable: true, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true, index: true },
  method: { type: String, enum: ['bkash', 'nagad', 'rocket', 'cod'], required: true, immutable: true },
  receiverNumber: { type: String, immutable: true },
  receiverAccountType: { type: String, enum: ['Personal', 'Agent'], immutable: true },
  senderNumber: String,
  transactionId: { type: String, trim: true, uppercase: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['pending', 'submitted', 'verified', 'rejected'], default: 'submitted', index: true },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
  rejectionReason: { type: String, trim: true, maxlength: 500 }
}, { timestamps: true });

paymentSchema.index({ transactionId: 1 }, { unique: true, partialFilterExpression: { transactionId: { $type: 'string' } } });
paymentSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
paymentSchema.index({ customerId: 1, createdAt: -1 });

export const Payment = mongoose.model<IPaymentDocument>('Payment', paymentSchema);
