import { Restaurant } from '../models/Restaurant';
import { Counter } from '../models/Counter';

const missingRestaurantId = {
  $or: [
    { restaurantId: { $exists: false } },
    { restaurantId: null },
    { restaurantId: '' }
  ]
};

const reserveRestaurantIds = async (count: number) => {
  // Initialize the counter without an aggregation update pipeline.
  await Counter.findByIdAndUpdate(
    'restaurantId',
    { $setOnInsert: { sequence: 100000 } },
    { upsert: true, new: true, setDefaultsOnInsert: false }
  );

  const counter = await Counter.findByIdAndUpdate(
    'restaurantId',
    { $inc: { sequence: count } },
    { upsert: true, new: true }
  );
  const end = counter.sequence;
  return Array.from({ length: count }, (_, index) => `RST-${end - count + index + 1}`);
};

export const ensureRestaurantIdentity = async (restaurant: any) => {
  if (restaurant.restaurantId) return restaurant;

  const [restaurantId] = await reserveRestaurantIds(1);
  const result = await Restaurant.collection.updateOne(
    { _id: restaurant._id, ...missingRestaurantId } as any,
    { $set: { restaurantId } }
  );

  // Another request may have assigned the ID first. Read that winning value.
  const assignedId = result.modifiedCount === 1
    ? restaurantId
    : (await Restaurant.collection.findOne(
        { _id: restaurant._id } as any,
        { projection: { restaurantId: 1 } }
      ))?.restaurantId;

  if (assignedId) restaurant.restaurantId = assignedId;
  return restaurant;
};

// Backfill legacy restaurants created before permanent public IDs were introduced.
export const backfillRestaurantIdentities = async () => {
  const batchSize = 500;
  const cursor = Restaurant.collection.find(missingRestaurantId as any, {
    projection: { _id: 1, name: 1 },
    batchSize
  });

  let batch: Array<{ _id: any; name?: string }> = [];
  const assignBatch = async () => {
    if (!batch.length) return;
    const ids = await reserveRestaurantIds(batch.length);
    await Restaurant.collection.bulkWrite(batch.map((restaurant, index) => ({
      updateOne: {
        filter: { _id: restaurant._id, ...missingRestaurantId },
        update: { $set: { restaurantId: ids[index] } }
      }
    })) as any, { ordered: false });
    batch.forEach((restaurant, index) => {
      console.info(`✔ Restaurant ID assigned: ${ids[index]} | Restaurant: ${restaurant.name || restaurant._id}`);
    });
    batch = [];
  };

  for await (const restaurant of cursor) {
    batch.push(restaurant);
    if (batch.length >= batchSize) await assignBatch();
  }
  await assignBatch();
};
