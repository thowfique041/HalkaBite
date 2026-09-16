import { RestaurantActivityLog, RestaurantStatusHistory } from '../models';

export const ensureRestaurantActivityIndexes = async () => {
  const indexName = 'restaurant_1_dedupeKey_1';
  await RestaurantActivityLog.createCollection();
  const indexes = await RestaurantActivityLog.collection.indexes();
  const current = indexes.find(index => index.name === indexName);
  const hasStringPartialFilter = JSON.stringify(current?.partialFilterExpression) === JSON.stringify({ dedupeKey: { $type: 'string' } });
  if (current && !hasStringPartialFilter) await RestaurantActivityLog.collection.dropIndex(indexName);
  if (!current || !hasStringPartialFilter) {
    await RestaurantActivityLog.collection.createIndex(
      { restaurant: 1, dedupeKey: 1 },
      { name: indexName, unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } }
    );
  }
};

export const logRestaurantActivity = async (restaurant: string, type: string, message: string, actor?: string, metadata?: Record<string, unknown>) =>
  RestaurantActivityLog.create({ restaurant, type, message, actor, metadata, occurredAt: new Date() });
export const changeRestaurantStatus = async (restaurant: string, status: 'open'|'closed'|'temporarily_closed'|'suspended'|'active', actor?: string) => {
  const now = new Date();
  await RestaurantStatusHistory.updateMany({ restaurant, endedAt: { $exists: false } }, { $set: { endedAt: now } });
  await RestaurantStatusHistory.create({ restaurant, status, startedAt: now, changedBy: actor });
  await logRestaurantActivity(restaurant, `restaurant_${status}`, `Restaurant status changed to ${status.replace('_', ' ')}.`, actor);
};
