import { EventEmitter } from 'events';

export interface OrderLifecycleEvent {
  orderId: string;
  orderNumber?: string;
  type: 'order_ready' | 'order_status_changed' | 'delivery_assigned' | 'delivery_status_changed' | 'delivery_presence_changed' | 'delivery_order_invalidated' | 'review_submitted';
  status: string;
  occurredAt: string;
}

const orderEventEmitter = new EventEmitter();
orderEventEmitter.setMaxListeners(1000);

export const publishOrderEvent = (event: OrderLifecycleEvent) => {
  orderEventEmitter.emit('order-lifecycle', event);
};

export default orderEventEmitter;
