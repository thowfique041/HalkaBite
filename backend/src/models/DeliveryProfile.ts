import mongoose, { Document, Schema } from 'mongoose';

export interface IDeliveryProfileDocument extends Document {
  user: mongoose.Types.ObjectId;
  isOnline: boolean;
  rating: number;
  reviewCount: number;
  vehicleType?: string;
  vehicleNumber?: string;
  licenseNumber?: string;
  nidNumber?: string;
  payoutMethod?: 'bkash' | 'nagad' | 'bank';
  payoutAccount?: string;
  currentLocation?: { lat: number; lng: number; updatedAt: Date };
  bonus: number;
  incentives: number;
  lastActiveAt: Date;
}

const deliveryProfileSchema = new Schema<IDeliveryProfileDocument>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  isOnline: { type: Boolean, default: false },
  rating: { type: Number, min: 0, max: 5, default: 5 },
  reviewCount: { type: Number, default: 0 },
  vehicleType: String,
  vehicleNumber: String,
  licenseNumber: String,
  nidNumber: String,
  payoutMethod: { type: String, enum: ['bkash', 'nagad', 'bank'] },
  payoutAccount: String,
  currentLocation: {
    lat: Number,
    lng: Number,
    updatedAt: Date
  },
  bonus: { type: Number, default: 0, min: 0 },
  incentives: { type: Number, default: 0, min: 0 },
  lastActiveAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const DeliveryProfile = mongoose.model<IDeliveryProfileDocument>('DeliveryProfile', deliveryProfileSchema);
