import { EventEmitter } from 'events';
import { Notification, NotificationType } from '../models/Notification';
import { Restaurant } from '../models/Restaurant';

const emitter = new EventEmitter();
emitter.setMaxListeners(1000);

export interface CreateRestaurantNotification {
  restaurantId: string;
  title: string;
  message: string;
  type: NotificationType;
  orderId?: string;
  reviewId?: string;
  metadata?: Record<string, unknown>;
}

export const restaurantNotificationChannel = (restaurantId: string) => `restaurant:${restaurantId}`;

export const createRestaurantNotification = async (input: CreateRestaurantNotification) => {
  const preferenceKey: Partial<Record<NotificationType, string>> = {
    new_order: 'newOrders', new_review: 'newReviews', rating_increased: 'newReviews',
    order_cancelled: 'orderCancellation', payment_received: 'paymentReceived',
    delivery_assigned: 'deliveryUpdates', order_picked_up: 'deliveryUpdates', order_delivered: 'deliveryUpdates',
    admin_announcement: 'adminAnnouncements'
  };
  const key = preferenceKey[input.type];
  if (key) {
    const restaurant = await Restaurant.findById(input.restaurantId).select('notificationPreferences');
    if (restaurant && (restaurant.notificationPreferences as any)?.[key] === false) return null;
  }
  const notification = await Notification.create(input);
  emitter.emit(restaurantNotificationChannel(input.restaurantId), notification.toObject());
  return notification;
};

export default emitter;
