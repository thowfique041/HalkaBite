import mongoose from 'mongoose';
import { FoodItem } from '../models';

export class FeaturedFoodNotFoundError extends Error {}

const unsetFeatured = {
  $set: { isFeatured: false },
  $unset: { featuredBy: 1, featuredAt: 1 }
};

export const assignFeaturedFood = async (foodId: string, adminId: string) => {
  if (!mongoose.isValidObjectId(foodId)) throw new FeaturedFoodNotFoundError('Food not found');
  return mongoose.connection.transaction(async session => {
    const food = await FoodItem.findOne({ _id: foodId, isDeleted: { $ne: true } }).select('_id').session(session);
    if (!food) throw new FeaturedFoodNotFoundError('Food not found');

    // Both writes are committed together. The partial unique index is the final
    // database-level guard if concurrent administrators attempt an assignment.
    await FoodItem.updateMany({ isFeatured: true }, unsetFeatured, { session });
    await FoodItem.updateOne(
      { _id: food._id },
      { $set: { isFeatured: true, featuredBy: adminId, featuredAt: new Date() } },
      { session, runValidators: true }
    );
    return food._id;
  });
};

export const removeFeaturedFood = async () => mongoose.connection.transaction(async session => {
  await FoodItem.updateMany({ isFeatured: true }, unsetFeatured, { session });
});

// Repairs legacy data created before the unique invariant existed. The newest
// assignment wins, and all other records are cleared in one transaction.
export const ensureFeaturedFoodInvariant = async () => {
  const featured = await FoodItem.find({ isFeatured: true }).select('_id featuredAt').sort({ featuredAt: -1, _id: -1 }).lean();
  if (featured.length <= 1) return;
  const winner = featured[0]._id;
  await mongoose.connection.transaction(async session => {
    await FoodItem.updateMany({ isFeatured: true, _id: { $ne: winner } }, unsetFeatured, { session });
  });
};

export const ensureFeaturedFoodIndex = async () => {
  await ensureFeaturedFoodInvariant();
  const indexes = await FoodItem.collection.indexes();
  const exactFeaturedIndexes = indexes.filter(index => {
    const keys = Object.keys(index.key || {});
    return keys.length === 1 && index.key?.isFeatured === 1;
  });
  const correctIndex = exactFeaturedIndexes.find(index =>
    index.unique === true && index.partialFilterExpression?.isFeatured === true
  );
  if (correctIndex) return;

  // Replace only the obsolete single-field isFeatured index. No unrelated
  // application or database indexes are touched.
  for (const index of exactFeaturedIndexes) {
    if (index.name && index.name !== '_id_') await FoodItem.collection.dropIndex(index.name);
  }
  await FoodItem.collection.createIndex(
    { isFeatured: 1 },
    { name: 'one_featured_food', unique: true, partialFilterExpression: { isFeatured: true } }
  );
};
