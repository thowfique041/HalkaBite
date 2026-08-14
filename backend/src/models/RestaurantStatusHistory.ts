import mongoose, { Document, Schema } from 'mongoose';
export interface IRestaurantStatusHistoryDocument extends Document { restaurant: mongoose.Types.ObjectId; status: 'online'|'offline'|'open'|'closed'|'temporarily_closed'|'suspended'|'active'; startedAt: Date; endedAt?: Date; changedBy?: mongoose.Types.ObjectId; }
const schema = new Schema<IRestaurantStatusHistoryDocument>({
  restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  status: { type: String, enum: ['online','offline','open','closed','temporarily_closed','suspended','active'], required: true },
  startedAt: { type: Date, default: Date.now, required: true }, endedAt: Date, changedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
schema.index({ restaurant: 1, startedAt: -1 }); schema.index({ restaurant: 1, endedAt: 1 });
export const RestaurantStatusHistory = mongoose.model<IRestaurantStatusHistoryDocument>('RestaurantStatusHistory', schema);

