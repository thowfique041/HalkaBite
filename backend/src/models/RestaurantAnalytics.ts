import mongoose, { Document, Schema } from 'mongoose';
export interface IRestaurantAnalyticsDocument extends Document { restaurant: mongoose.Types.ObjectId; date: Date; orders: number; completedOrders: number; cancelledOrders: number; grossRevenue: number; commission: number; netEarnings: number; activeMinutes: number; newCustomers: number; reviews: number; ratingTotal: number; }
const schema = new Schema<IRestaurantAnalyticsDocument>({
  restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true }, date: { type: Date, required: true },
  orders: { type: Number, default: 0 }, completedOrders: { type: Number, default: 0 }, cancelledOrders: { type: Number, default: 0 },
  grossRevenue: { type: Number, default: 0 }, commission: { type: Number, default: 0 }, netEarnings: { type: Number, default: 0 },
  activeMinutes: { type: Number, default: 0 }, newCustomers: { type: Number, default: 0 }, reviews: { type: Number, default: 0 }, ratingTotal: { type: Number, default: 0 }
}, { timestamps: true });
schema.index({ restaurant: 1, date: 1 }, { unique: true });
export const RestaurantAnalytics = mongoose.model<IRestaurantAnalyticsDocument>('RestaurantAnalytics', schema);

