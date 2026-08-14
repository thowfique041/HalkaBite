import mongoose from 'mongoose';
import { CommissionHistory, CommissionSetting, Restaurant } from '../models';
import type { CommissionMode, CommissionScope } from '../models/CommissionSetting';

export interface ResolvedCommission { settingId?: mongoose.Types.ObjectId; mode: CommissionMode; value: number; amount: number; restaurantEarnings: number; }
export const calculateCommission = (base: number, mode: CommissionMode, value: number) => {
  if (mode === 'none') return 0;
  const amount = Math.min(base, Math.max(0, mode === 'percentage' ? base * value / 100 : value));
  return Math.round((amount + Number.EPSILON) * 100) / 100;
};

export const resolveCommission = async (restaurantId: mongoose.Types.ObjectId | string, base: number): Promise<ResolvedCommission> => {
  const restaurant = await Restaurant.findById(restaurantId).select('address.city cuisine').lean();
  if (!restaurant) throw new Error('Restaurant not found while resolving commission');
  const rules = await CommissionSetting.find({ isActive: true, $or: [
    { scope: 'restaurant', restaurant: restaurant._id },
    { scope: 'city', city: { $regex: `^${String(restaurant.address.city).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
    { scope: 'category', category: { $in: restaurant.cuisine } }, { scope: 'global' }
  ] }).lean();
  const priority: Record<string, number> = { restaurant: 4, city: 3, category: 2, global: 1 };
  const selected = rules.sort((a, b) => priority[b.scope] - priority[a.scope])[0];
  const mode: CommissionMode = selected?.mode || 'percentage'; const value = selected?.value ?? 5;
  const amount = calculateCommission(base, mode, value);
  return { settingId: selected?._id, mode, value, amount, restaurantEarnings: Math.round((Math.max(0, base - amount) + Number.EPSILON) * 100) / 100 };
};

export const upsertCommissionSetting = async (input: { mode: CommissionMode; value: number; scope: CommissionScope; restaurant?: string; category?: string; city?: string; reason: string; adminId: string }) => {
  if (!['percentage','fixed','none'].includes(input.mode)) throw new Error('Invalid commission mode');
  if (!['global','restaurant','category','city'].includes(input.scope)) throw new Error('Invalid commission scope');
  if (!Number.isFinite(input.value) || input.value < 0 || (input.mode === 'percentage' && input.value > 100)) throw new Error('Invalid commission value');
  if (!input.reason.trim()) throw new Error('A reason is required');
  if (input.scope === 'restaurant' && !mongoose.isValidObjectId(input.restaurant)) throw new Error('A valid restaurant is required');
  if (input.scope === 'category' && !input.category?.trim()) throw new Error('Restaurant category is required');
  if (input.scope === 'city' && !input.city?.trim()) throw new Error('City is required');
  const match: any = { scope: input.scope, isActive: true };
  if (input.scope === 'restaurant') match.restaurant = input.restaurant;
  if (input.scope === 'category') match.category = input.category!.trim();
  if (input.scope === 'city') match.city = input.city!.trim();
  return mongoose.connection.transaction(async session => {
    const previous = await CommissionSetting.findOne(match).session(session);
    const update = { mode: input.mode, value: input.mode === 'none' ? 0 : input.value, scope: input.scope,
      restaurant: input.scope === 'restaurant' ? input.restaurant : undefined, category: input.scope === 'category' ? input.category!.trim() : undefined,
      city: input.scope === 'city' ? input.city!.trim() : undefined, isActive: true, updatedBy: input.adminId, reason: input.reason.trim() };
    const setting = previous
      ? await CommissionSetting.findByIdAndUpdate(previous._id, { $set: update }, { new: true, runValidators: true, session })
      : await new CommissionSetting(update).save({ session });
    await CommissionHistory.create([{ setting: setting!._id, scope: input.scope,
      target: input.restaurant || input.category || input.city || 'global', oldMode: previous?.mode, oldValue: previous?.value,
      newMode: input.mode, newValue: update.value, changedBy: input.adminId, reason: input.reason.trim() }], { session });
    return setting;
  });
};
