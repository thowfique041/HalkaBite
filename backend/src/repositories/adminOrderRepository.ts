import { Order } from '../models';

export const aggregateAdminOrders = (pipeline: Record<string, unknown>[]) =>
  Order.collection.aggregate(pipeline).toArray();
