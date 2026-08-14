import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
  | 'new_order' | 'new_review' | 'order_cancelled' | 'delivery_assigned'
  | 'order_picked_up' | 'order_delivered' | 'payment_received' | 'payment_submitted'
  | 'rating_increased' | 'milestone' | 'admin_announcement' | 'identity_update';

export interface INotificationDocument extends Document {
  restaurantId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  orderId?: mongoose.Types.ObjectId;
  reviewId?: mongoose.Types.ObjectId;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotificationDocument>({
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  type: {
    type: String,
    required: true,
    enum: ['new_order', 'new_review', 'order_cancelled', 'delivery_assigned', 'order_picked_up',
      'order_delivered', 'payment_received', 'payment_submitted', 'rating_increased', 'milestone', 'admin_announcement', 'identity_update']
  },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  reviewId: { type: Schema.Types.ObjectId, ref: 'Review' },
  isRead: { type: Boolean, default: false, index: true },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

notificationSchema.index({ restaurantId: 1, createdAt: -1 });
notificationSchema.index({ restaurantId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotificationDocument>('Notification', notificationSchema);
