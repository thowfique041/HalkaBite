import mongoose, { Document, Schema } from 'mongoose';
export interface IRestaurantActivityLogDocument extends Document { restaurant: mongoose.Types.ObjectId; type: string; message: string; actor?: mongoose.Types.ObjectId; metadata?: Record<string, unknown>; occurredAt: Date; dedupeKey?: string; }
const schema = new Schema<IRestaurantActivityLogDocument>({
  restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true }, type: { type: String, required: true, index: true },
  message: { type: String, required: true, maxlength: 500 }, actor: { type: Schema.Types.ObjectId, ref: 'User' }, metadata: Schema.Types.Mixed,
  occurredAt: { type: Date, default: Date.now, required: true }, dedupeKey: String
}, { timestamps: true });
schema.index({ restaurant: 1, occurredAt: -1 });
// Sparse indexes still index an explicitly stored null. Restrict the unique
// constraint to real string keys so ordinary activity rows can coexist.
schema.index(
  { restaurant: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } }
);
export const RestaurantActivityLog = mongoose.model<IRestaurantActivityLogDocument>('RestaurantActivityLog', schema);
