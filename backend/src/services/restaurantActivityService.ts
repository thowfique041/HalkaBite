import { RestaurantActivityLog, RestaurantStatusHistory } from '../models';
export const logRestaurantActivity = async (restaurant: string, type: string, message: string, actor?: string, metadata?: Record<string, unknown>) =>
  RestaurantActivityLog.create({ restaurant, type, message, actor, metadata, occurredAt: new Date() });
export const changeRestaurantStatus = async (restaurant: string, status: 'open'|'closed'|'temporarily_closed'|'suspended'|'active', actor?: string) => {
  const now = new Date();
  await RestaurantStatusHistory.updateMany({ restaurant, endedAt: { $exists: false } }, { $set: { endedAt: now } });
  await RestaurantStatusHistory.create({ restaurant, status, startedAt: now, changedBy: actor });
  await logRestaurantActivity(restaurant, `restaurant_${status}`, `Restaurant status changed to ${status.replace('_', ' ')}.`, actor);
};

