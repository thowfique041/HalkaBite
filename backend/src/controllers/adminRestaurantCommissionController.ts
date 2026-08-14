import { Response } from 'express';
import mongoose, { PipelineStage } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { CommissionPayment, CommissionSetting, Counter, Order, Restaurant } from '../models';
import type { CommissionPaymentMethod } from '../models/CommissionPayment';

const eligibleOrderMatch = (restaurantId: mongoose.Types.ObjectId) => ({
  restaurant: restaurantId,
  orderStatus: 'delivered',
  paymentStatus: 'paid'
});
const commissionExpression = { $ifNull: ['$platformCommission', { $multiply: [{ $subtract: ['$subtotal', '$discount'] }, 0.05] }] };
const earningsExpression = { $ifNull: ['$restaurantEarnings', { $subtract: [{ $subtract: ['$subtotal', '$discount'] }, commissionExpression] }] };
const currency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const parseDate = (value: unknown, endOfDay = false) => {
  if (typeof value !== 'string' || !value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setHours(23, 59, 59, 999);
  return date;
};
const dateMatch = (field: string, from: unknown, to: unknown) => {
  const start = parseDate(from), end = parseDate(to, true);
  if (!start && !end) return {};
  return { [field]: { ...(start && { $gte: start }), ...(end && { $lte: end }) } };
};
const fromOrToStage = (from: unknown, to: unknown): PipelineStage[] => {
  const match = dateMatch('actualDeliveryTime', from, to);
  return Object.keys(match).length ? [{ $match: match }] : [];
};
const loadRestaurant = async (value: string) => {
  if (!mongoose.isValidObjectId(value)) return null;
  return Restaurant.findById(value).select('name restaurantId address.city cuisine').lean();
};
const currentSetting = async (restaurant: NonNullable<Awaited<ReturnType<typeof loadRestaurant>>>) => {
  const settings = await CommissionSetting.find({ isActive: true, $or: [
    { scope: 'restaurant', restaurant: restaurant._id },
    { scope: 'city', city: { $regex: `^${String(restaurant.address.city).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
    { scope: 'category', category: { $in: restaurant.cuisine } },
    { scope: 'global' }
  ] }).lean();
  const priority: Record<string, number> = { restaurant: 4, city: 3, category: 2, global: 1 };
  const selected = settings.sort((a, b) => priority[b.scope] - priority[a.scope])[0];
  return selected ? { mode: selected.mode, value: selected.value, scope: selected.scope } : { mode: 'percentage' as const, value: 5, scope: 'default' as const };
};
const summaryFor = async (restaurantId: mongoose.Types.ObjectId, session?: mongoose.ClientSession) => {
  const [orders, payments] = await Promise.all([
    Order.aggregate([
      { $match: eligibleOrderMatch(restaurantId) },
      { $group: { _id: null, totalOrders: { $sum: 1 }, totalOrderValue: { $sum: '$totalAmount' }, eligibleSales: { $sum: { $subtract: ['$subtotal', '$discount'] } }, totalCommission: { $sum: commissionExpression }, restaurantEarnings: { $sum: earningsExpression } } }
    ]).session(session || null),
    CommissionPayment.aggregate([
      { $match: { restaurantId, status: 'verified' } },
      { $group: { _id: null, paid: { $sum: '$amount' } } }
    ]).session(session || null)
  ]);
  const generated = Number(orders[0]?.totalCommission || 0), paid = Number(payments[0]?.paid || 0);
  return { totalOrders: Number(orders[0]?.totalOrders || 0), totalOrderValue: currency(Number(orders[0]?.totalOrderValue || 0)), eligibleSales: currency(Number(orders[0]?.eligibleSales || 0)), totalCommission: currency(generated), commissionPaid: currency(paid), commissionDue: currency(Math.max(0, generated - paid)), restaurantEarnings: currency(Number(orders[0]?.restaurantEarnings || 0)) };
};

export const getRestaurantCommissionSummary = async (req: AuthRequest, res: Response) => {
  const restaurant = await loadRestaurant(req.params.restaurantId);
  if (!restaurant) return res.status(mongoose.isValidObjectId(req.params.restaurantId) ? 404 : 400).json({ success: false, message: mongoose.isValidObjectId(req.params.restaurantId) ? 'Restaurant not found' : 'Invalid restaurant ID' });
  const [summary, setting] = await Promise.all([summaryFor(restaurant._id), currentSetting(restaurant)]);
  return res.json({ success: true, data: { restaurant: { _id: restaurant._id, restaurantId: restaurant.restaurantId, name: restaurant.name }, ...summary, currentCommission: setting } });
};

export const getRestaurantCommissionOrders = async (req: AuthRequest, res: Response) => {
  const restaurant = await loadRestaurant(req.params.restaurantId);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const paid = (await CommissionPayment.aggregate([{ $match: { restaurantId: restaurant._id, status: 'verified' } }, { $group: { _id: null, value: { $sum: '$amount' } } }]))[0]?.value || 0;
  const pipeline: PipelineStage[] = [
    { $match: eligibleOrderMatch(restaurant._id) },
    { $addFields: { commissionAmount: commissionExpression, effectiveRestaurantEarnings: earningsExpression } },
    { $setWindowFields: { sortBy: { actualDeliveryTime: 1, _id: 1 }, output: { cumulativeCommission: { $sum: '$commissionAmount', window: { documents: ['unbounded', 'current'] } } } } },
    { $addFields: { commissionPaymentStatus: { $cond: [{ $lte: ['$cumulativeCommission', paid] }, 'paid', { $cond: [{ $lt: [{ $subtract: ['$cumulativeCommission', '$commissionAmount'] }, paid] }, 'partial', 'pending'] }] } } },
    ...(fromOrToStage(req.query.from, req.query.to)),
    ...(typeof req.query.status === 'string' && req.query.status !== 'all' ? [{ $match: { commissionPaymentStatus: req.query.status } } as PipelineStage] : []),
    { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'customer' } },
    { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
    { $sort: { actualDeliveryTime: -1, _id: -1 } },
    { $facet: { rows: [{ $skip: (page - 1) * limit }, { $limit: limit }, { $project: { orderNumber: 1, customer: { _id: '$customer._id', name: '$customer.name' }, orderDate: '$actualDeliveryTime', orderTotal: '$totalAmount', eligibleSales: { $subtract: ['$subtotal', '$discount'] }, commissionMode: { $ifNull: ['$commissionMode', 'percentage'] }, commissionValue: { $ifNull: ['$commissionValue', 5] }, commissionAmount: 1, restaurantEarnings: '$effectiveRestaurantEarnings', commissionPaymentStatus: 1 } }], count: [{ $count: 'total' }] } }
  ];
  const result = (await Order.aggregate(pipeline))[0] || { rows: [], count: [] };
  const total = result.count[0]?.total || 0;
  return res.json({ success: true, data: { orders: result.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
};

export const getRestaurantCommissionPayments = async (req: AuthRequest, res: Response) => {
  const restaurant = await loadRestaurant(req.params.restaurantId);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const query: Record<string, unknown> = { restaurantId: restaurant._id, ...dateMatch('paymentDate', req.query.from, req.query.to) };
  if (typeof req.query.status === 'string' && req.query.status !== 'all') query.status = req.query.status;
  if (typeof req.query.method === 'string' && req.query.method !== 'all') query.paymentMethod = req.query.method;
  const [payments, total] = await Promise.all([CommissionPayment.find(query).populate('createdBy', 'name email').sort({ paymentDate: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), CommissionPayment.countDocuments(query)]);
  return res.json({ success: true, data: { payments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
};

export const recordRestaurantCommissionPayment = async (req: AuthRequest, res: Response) => {
  const restaurant = await loadRestaurant(req.params.restaurantId);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
  const rawAmount = Number(req.body?.amount), amount = currency(rawAmount), method = req.body?.paymentMethod as CommissionPaymentMethod;
  const referenceId = typeof req.body?.referenceId === 'string' ? req.body.referenceId.trim().toUpperCase() : '';
  const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : '';
  const paymentDate = parseDate(req.body?.paymentDate);
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero' });
  if (Math.abs(rawAmount - amount) > 0.000001) return res.status(400).json({ success: false, message: 'Payment amount can have at most two decimal places' });
  if (!['cash', 'bkash', 'nagad', 'rocket', 'bank_transfer', 'other'].includes(method)) return res.status(400).json({ success: false, message: 'Select a valid payment method' });
  if (method !== 'cash' && !referenceId) return res.status(400).json({ success: false, message: 'Transaction or reference ID is required for this payment method' });
  if (!paymentDate) return res.status(400).json({ success: false, message: 'A valid payment date is required' });
  if (paymentDate.getTime() > Date.now() + 300000) return res.status(400).json({ success: false, message: 'Payment date cannot be in the future' });
  if (notes.length > 1000) return res.status(400).json({ success: false, message: 'Notes cannot exceed 1000 characters' });
  try {
    const payment = await mongoose.connection.transaction(async session => {
      const summary = await summaryFor(restaurant._id, session);
      if (summary.commissionDue <= 0) throw new Error('This restaurant has no outstanding commission');
      if (amount > summary.commissionDue + 0.009) throw new Error('Payment amount cannot exceed the current commission due.');
      const counter = await Counter.findByIdAndUpdate('commissionPayment', { $inc: { sequence: 1 } }, { upsert: true, new: true, session });
      const paymentId = `CP-${String(counter.sequence).padStart(5, '0')}`;
      const remainingDue = currency(Math.max(0, summary.commissionDue - amount));
      const created = await CommissionPayment.create([{ paymentId, restaurantId: restaurant._id, amount, paymentMethod: method, referenceId: referenceId || undefined, paymentDate, status: 'verified', previousDue: summary.commissionDue, remainingDue, notes: notes || undefined, createdBy: req.user._id }], { session });
      return created[0];
    });
    const populated = await CommissionPayment.findById(payment._id).populate('restaurantId', 'name restaurantId').populate('createdBy', 'name email');
    return res.status(201).json({ success: true, message: 'Commission payment recorded successfully', data: populated });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) return res.status(409).json({ success: false, message: 'This payment reference has already been recorded' });
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unable to record commission payment' });
  }
};

export const getRestaurantCommissionAnalytics = async (req: AuthRequest, res: Response) => {
  const restaurant = await loadRestaurant(req.params.restaurantId);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
  const from = parseDate(req.query.from) || new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1), to = parseDate(req.query.to, true) || new Date();
  const [generated, paid] = await Promise.all([
    Order.aggregate([{ $match: { ...eligibleOrderMatch(restaurant._id), actualDeliveryTime: { $gte: from, $lte: to } } }, { $group: { _id: { year: { $year: '$actualDeliveryTime' }, month: { $month: '$actualDeliveryTime' } }, sales: { $sum: { $subtract: ['$subtotal', '$discount'] } }, commission: { $sum: commissionExpression }, earnings: { $sum: earningsExpression } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
    CommissionPayment.aggregate([{ $match: { restaurantId: restaurant._id, status: 'verified', paymentDate: { $gte: from, $lte: to } } }, { $group: { _id: { year: { $year: '$paymentDate' }, month: { $month: '$paymentDate' } }, paid: { $sum: '$amount' } } }])
  ]);
  const generatedMap = new Map(generated.map(row => [`${row._id.year}-${row._id.month}`, row]));
  const paidMap = new Map(paid.map(row => [`${row._id.year}-${row._id.month}`, row]));
  const keys = Array.from(new Set([...generatedMap.keys(), ...paidMap.keys()])).sort();
  const monthly = keys.map(key => { const order = generatedMap.get(key), payment = paidMap.get(key); const [year, month] = key.split('-').map(Number); return { year, month, sales: currency(order?.sales || 0), commission: currency(order?.commission || 0), earnings: currency(order?.earnings || 0), paid: currency(payment?.paid || 0) }; });
  const summary = await summaryFor(restaurant._id);
  return res.json({ success: true, data: { monthly, paidVsDue: { paid: summary.commissionPaid, due: summary.commissionDue } } });
};

export const getRestaurantCommission = getRestaurantCommissionSummary;
