import mongoose from 'mongoose';
import { Campaign, CustomerNotification, Order, Restaurant, User } from '../models';

export const effectiveStatus = (campaign: any, now = new Date()) => campaign.status === 'cancelled' ? 'cancelled' : now < campaign.startAt ? 'scheduled' : now >= campaign.endAt ? 'expired' : 'active';
export const isEligible = (campaign: any, userId?: string) => campaign.targetType === 'everyone' || (!!userId && campaign.eligibleCustomers.some((id: any) => id.toString() === userId));
export const discountedPrice = (price: number, campaign: any) => Math.max(0, campaign.discountType === 'percentage' ? price * (1 - campaign.discountValue / 100) : price - campaign.discountValue);

export const eligibleCustomersFor = async (restaurantId: mongoose.Types.ObjectId, body: any) => {
  if (body.targetType === 'everyone') return [];
  if (body.targetType === 'selected') return [...new Set((body.selectedCustomers || []).map(String))];
  const rows = await Order.aggregate([{ $match: { restaurant: restaurantId, orderStatus: { $ne: 'cancelled' } } }, { $group: { _id: '$user', orders: { $sum: 1 }, spending: { $sum: '$totalAmount' }, lastOrder: { $max: '$createdAt' } } }]);
  const cutoff = new Date(Date.now() - 30 * 86400000); const rules = body.eligibility || {};
  return rows.filter(row => (rules.newCustomers && row.orders === 1) || (rules.returningCustomers && row.orders > 1) || (rules.vipCustomers && (row.orders >= 10 || row.spending >= 10000)) || (rules.fivePlusOrders && row.orders >= 5) || (rules.inactiveThirtyDays && row.lastOrder < cutoff) || (Number(rules.minimumSpending) > 0 && row.spending >= Number(rules.minimumSpending))).map(row => row._id.toString());
};

export const activateDueCampaigns = async () => {
  const now = new Date();
  await Campaign.updateMany({ status: { $in: ['scheduled','active'] }, endAt: { $lte: now } }, { status: 'expired' });
  const due = await Campaign.find({ status: 'scheduled', startAt: { $lte: now }, endAt: { $gt: now } });
  for (const campaign of due) {
    campaign.status = 'active';
    if (!campaign.notifiedAt) {
      const restaurant = await Restaurant.findById(campaign.restaurant).select('name');
      const recipients = campaign.targetType === 'everyone'
        ? (await User.find({ role: 'user' }).select('_id').lean()).map(user => user._id) : campaign.eligibleCustomers;
      if (recipients.length) await CustomerNotification.insertMany(recipients.map(user => ({ user, campaign: campaign._id, title: `${restaurant?.name || 'A restaurant'} sent you an offer!`, message: `${campaign.promotionLabel}: ${campaign.discountValue}${campaign.discountType === 'percentage' ? '%' : ' BDT'} OFF. Valid until ${campaign.endAt.toLocaleString()}.` })), { ordered: false }).catch(() => undefined);
      campaign.notifiedAt = now;
    }
    await campaign.save();
  }
};

export const findActiveCampaign = async (restaurantId: any, foodId: any, userId?: string, basePrice = 100) => {
  const campaigns = await Campaign.find({ restaurant: restaurantId, foodItems: foodId, status: { $ne: 'cancelled' }, startAt: { $lte: new Date() }, endAt: { $gt: new Date() } });
  return campaigns.filter(campaign => isEligible(campaign, userId)).sort((a,b) => discountedPrice(basePrice,a)-discountedPrice(basePrice,b))[0] || null;
};
