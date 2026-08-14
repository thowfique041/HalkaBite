import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { FoodItem, Order, Restaurant, Review } from '../models';

const startOfDay = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const startOfWeek = (date = new Date()) => { const value = startOfDay(date); value.setDate(value.getDate() - 6); return value; };
const startOfMonth = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), 1);
const percentChange = (current: number, previous: number) => previous ? ((current - previous) / previous) * 100 : current ? 100 : 0;

const ownerRestaurant = (ownerId: string) => Restaurant.findOne({ owner: ownerId }).select('_id name rating reviewCount');

export const getRestaurantAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const restaurant = await ownerRestaurant(req.user._id);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    const restaurantId = restaurant._id; const now = new Date();
    const today = startOfDay(now); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const week = startOfWeek(now); const previousWeek = new Date(week); previousWeek.setDate(previousWeek.getDate() - 7);
    const month = startOfMonth(now); const previousMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const search = String(req.query.search || '').trim(); const sortField = ['name', 'totalOrders', 'totalRevenue', 'rating', 'reviewCount'].includes(String(req.query.sortBy)) ? String(req.query.sortBy) : 'totalOrders';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const [revenueRows, orderStatusRows, menuRows, reviewRows, dailyRows, monthlyRows, salesRows, performanceRows] = await Promise.all([
      Order.aggregate([
        { $match: { restaurant: restaurantId, orderStatus: 'delivered' } },
        { $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
          today: { $sum: { $cond: [{ $gte: ['$actualDeliveryTime', today] }, '$totalAmount', 0] } },
          yesterday: { $sum: { $cond: [{ $and: [{ $gte: ['$actualDeliveryTime', yesterday] }, { $lt: ['$actualDeliveryTime', today] }] }, '$totalAmount', 0] } },
          weekly: { $sum: { $cond: [{ $gte: ['$actualDeliveryTime', week] }, '$totalAmount', 0] } },
          previousWeekly: { $sum: { $cond: [{ $and: [{ $gte: ['$actualDeliveryTime', previousWeek] }, { $lt: ['$actualDeliveryTime', week] }] }, '$totalAmount', 0] } },
          monthly: { $sum: { $cond: [{ $gte: ['$actualDeliveryTime', month] }, '$totalAmount', 0] } },
          previousMonthly: { $sum: { $cond: [{ $and: [{ $gte: ['$actualDeliveryTime', previousMonth] }, { $lt: ['$actualDeliveryTime', month] }] }, '$totalAmount', 0] } }
        } }
      ]),
      Order.aggregate([{ $match: { restaurant: restaurantId } }, { $group: { _id: '$orderStatus', count: { $sum: 1 } } }]),
      FoodItem.aggregate([{ $match: { restaurant: restaurantId, isDeleted: { $ne: true } } }, { $group: { _id: null, total: { $sum: 1 }, available: { $sum: { $cond: ['$isAvailable', 1, 0] } } } }]),
      Review.aggregate([{ $match: { $or: [{ restaurant: restaurantId }, { foodItem: { $in: await FoodItem.find({ restaurant: restaurantId }).distinct('_id') } }] } }, { $group: { _id: null, total: { $sum: 1 }, average: { $avg: '$rating' } } }]),
      Order.aggregate([{ $match: { restaurant: restaurantId, orderStatus: 'delivered', actualDeliveryTime: { $gte: week } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$actualDeliveryTime' } }, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Order.aggregate([{ $match: { restaurant: restaurantId, orderStatus: 'delivered', actualDeliveryTime: { $gte: new Date(now.getFullYear() - 1, now.getMonth() + 1, 1) } } }, { $group: { _id: { year: { $year: '$actualDeliveryTime' }, month: { $month: '$actualDeliveryTime' } }, revenue: { $sum: '$totalAmount' } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
      Order.aggregate([{ $match: { restaurant: restaurantId, orderStatus: 'delivered' } }, { $unwind: '$items' }, { $group: { _id: { $ifNull: ['$items.foodId', '$items.foodItem'] }, name: { $first: { $ifNull: ['$items.foodName', '$items.name'] } }, image: { $first: '$items.foodImage' }, totalOrders: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.price' } } }]),
      FoodItem.aggregate([
        { $match: { restaurant: restaurantId, ...(search ? { name: { $regex: search, $options: 'i' } } : {}) } },
        { $lookup: { from: 'orders', let: { foodId: '$_id' }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$restaurant', restaurantId] }, { $eq: ['$orderStatus', 'delivered'] }] } } }, { $unwind: '$items' }, { $match: { $expr: { $eq: [{ $ifNull: ['$items.foodId', '$items.foodItem'] }, '$$foodId'] } } }, { $group: { _id: null, totalOrders: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.price' } } }], as: 'sales' } },
        { $addFields: { totalOrders: { $ifNull: [{ $first: '$sales.totalOrders' }, 0] }, totalRevenue: { $ifNull: [{ $first: '$sales.totalRevenue' }, 0] } } },
        { $project: { name: 1, image: 1, rating: 1, reviewCount: 1, isDeleted: 1, totalOrders: 1, totalRevenue: 1 } },
        { $sort: { [sortField]: sortOrder, _id: 1 } }, { $facet: { rows: [{ $skip: (page - 1) * limit }, { $limit: limit }], count: [{ $count: 'total' }] } }
      ])
    ]);

    const revenue = revenueRows[0] || { total: 0, today: 0, yesterday: 0, weekly: 0, previousWeekly: 0, monthly: 0, previousMonthly: 0 };
    const statuses: Record<string, number> = { pending: 0, preparing: 0, picked_up: 0, delivered: 0, cancelled: 0, confirmed: 0, ready: 0, out_for_delivery: 0 };
    orderStatusRows.forEach(row => { statuses[row._id] = row.count; });
    statuses.picked_up = await Order.countDocuments({ restaurant: restaurantId, deliveryStatus: 'picked_up' });
    const menu = menuRows[0] || { total: 0, available: 0 }; const reviews = reviewRows[0] || { total: 0, average: 0 };
    const foodIds = salesRows.map(row => row._id); const foodDetails = await FoodItem.find({ _id: { $in: foodIds } }).select('name image rating reviewCount isDeleted');
    const detailedSales = salesRows.map(row => ({ ...row, food: foodDetails.find(food => food._id.toString() === row._id.toString()) || { _id: row._id, name: row.name || 'Deleted Food Item', image: row.image || '', rating: 0, reviewCount: 0, isDeleted: true } }));
    const bySales = [...detailedSales].sort((a, b) => b.totalOrders - a.totalOrders);
    const allFoods: any[] = await FoodItem.find({ restaurant: restaurantId }).select('name image rating reviewCount isDeleted').lean();
    const historicalReviewFoods = await Review.aggregate([
      { $match: { $or: [{ restaurant: restaurantId }, { foodItem: { $in: foodIds } }] } },
      { $match: { $or: [{ foodId: { $ne: null } }, { foodItem: { $ne: null } }] } },
      { $group: { _id: { $ifNull: ['$foodId', '$foodItem'] }, name: { $first: '$foodName' }, image: { $first: '$foodImage' }, rating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } }
    ]);
    historicalReviewFoods.forEach(history => {
      const existing = allFoods.find(food => food._id.toString() === history._id.toString());
      if (existing) { existing.rating = history.rating; existing.reviewCount = history.reviewCount; }
      else {
        const orderSnapshot = salesRows.find(row => row._id.toString() === history._id.toString());
        allFoods.push({ _id: history._id, name: history.name || orderSnapshot?.name || 'Deleted Food Item', image: history.image || orderSnapshot?.image || '', rating: history.rating, reviewCount: history.reviewCount, isDeleted: true });
      }
    });
    const performance = performanceRows[0] || { rows: [], count: [] };
    const knownPerformanceIds = new Set(performance.rows.map((row: any) => row._id.toString()));
    const deletedSalesFallback = detailedSales
      .filter(row => row.food.isDeleted && !knownPerformanceIds.has(row._id.toString()) && (!search || row.food.name.toLowerCase().includes(search.toLowerCase())))
      .map(row => { const reviewHistory = allFoods.find(food => food._id.toString() === row._id.toString()); return { _id: row._id, name: row.food.name, image: row.food.image || '', isDeleted: true, rating: reviewHistory?.rating || row.food.rating || 0, reviewCount: reviewHistory?.reviewCount || row.food.reviewCount || 0, totalOrders: row.totalOrders, totalRevenue: row.totalRevenue }; });
    if (page === 1) performance.rows = [...deletedSalesFallback, ...performance.rows].slice(0, limit);
    const totalPerformance = (performance.count[0]?.total || 0) + deletedSalesFallback.length;
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, data: {
      revenue: { total: revenue.total, today: revenue.today, weekly: revenue.weekly, monthly: revenue.monthly, trends: { today: percentChange(revenue.today, revenue.yesterday), weekly: percentChange(revenue.weekly, revenue.previousWeekly), monthly: percentChange(revenue.monthly, revenue.previousMonthly) } },
      orders: { total: orderStatusRows.reduce((sum, row) => sum + row.count, 0), ...statuses },
      menu: { total: menu.total, available: menu.available, outOfStock: menu.total - menu.available },
      reviews: { total: reviews.total, average: reviews.average || 0 },
      highlights: { bestSelling: bySales[0]?.food || null, mostReviewed: [...allFoods].filter(food => food.reviewCount > 0).sort((a,b) => b.reviewCount - a.reviewCount)[0] || null, highestRated: [...allFoods].filter(food => food.reviewCount > 0).sort((a,b) => b.rating - a.rating)[0] || null },
      charts: { dailySales: dailyRows, monthlyRevenue: monthlyRows, orderStatus: statuses, topSelling: bySales.slice(0, 5).map(row => ({ name: row.food.name, value: row.totalOrders })), topRated: [...allFoods].filter(food => food.reviewCount > 0).sort((a,b) => b.rating - a.rating).slice(0,5).map(food => ({ name: food.name, value: food.rating })) },
      foodPerformance: { rows: performance.rows, pagination: { page, limit, total: totalPerformance, pages: Math.ceil(totalPerformance / limit) } }
    } });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message || 'Failed to load analytics' }); }
};

export const getRestaurantEarnings = async (req: AuthRequest, res: Response) => {
  try {
    const restaurant = await ownerRestaurant(req.user._id);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    const now = new Date(); const today = startOfDay(now); const week = startOfWeek(now); const month = startOfMonth(now);
    const page = req.query.export === 'true' ? 1 : Math.max(1, Number(req.query.page) || 1);
    const limit = req.query.export === 'true' ? 10000 : Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const search = String(req.query.search || '').trim(); const from = req.query.from ? new Date(String(req.query.from)) : undefined; const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    if (to) to.setHours(23, 59, 59, 999);
    const match: any = { restaurant: restaurant._id, orderStatus: 'delivered', paymentStatus: 'paid' };
    if (from || to) match.actualDeliveryTime = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
    const pipeline: any[] = [{ $match: match }, { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'customer' } }, { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } }, { $addFields: { foodTotal: { $subtract: ['$totalAmount', '$deliveryFee'] }, commission: { $ifNull: ['$platformCommission', { $multiply: [{ $subtract: ['$totalAmount', '$deliveryFee'] }, 0.05] }] }, restaurantEarnings: { $ifNull: ['$restaurantEarnings', { $multiply: [{ $subtract: ['$totalAmount', '$deliveryFee'] }, 0.95] }] } } }];
    if (search) pipeline.push({ $match: { $or: [{ orderNumber: { $regex: search, $options: 'i' } }, { 'customer.name': { $regex: search, $options: 'i' } }] } });
    const [summaryRows, transactionRows] = await Promise.all([
      Order.aggregate([{ $match: { restaurant: restaurant._id, orderStatus: 'delivered', paymentStatus: 'paid' } }, { $addFields: { foodTotal: { $subtract: ['$totalAmount', '$deliveryFee'] }, effectiveCommission: { $ifNull: ['$platformCommission', { $multiply: [{ $subtract: ['$totalAmount', '$deliveryFee'] }, 0.05] }] }, effectiveEarnings: { $ifNull: ['$restaurantEarnings', { $multiply: [{ $subtract: ['$totalAmount', '$deliveryFee'] }, 0.95] }] } } }, { $group: { _id: null, gross: { $sum: '$foodTotal' }, today: { $sum: { $cond: [{ $gte: ['$actualDeliveryTime', today] }, '$effectiveEarnings', 0] } }, yesterday: { $sum: { $cond: [{ $and: [{ $gte: ['$actualDeliveryTime', new Date(today.getTime() - 86400000)] }, { $lt: ['$actualDeliveryTime', today] }] }, '$effectiveEarnings', 0] } }, weekly: { $sum: { $cond: [{ $gte: ['$actualDeliveryTime', week] }, '$effectiveEarnings', 0] } }, previousWeekly: { $sum: { $cond: [{ $and: [{ $gte: ['$actualDeliveryTime', new Date(week.getTime() - 7 * 86400000)] }, { $lt: ['$actualDeliveryTime', week] }] }, '$effectiveEarnings', 0] } }, monthly: { $sum: { $cond: [{ $gte: ['$actualDeliveryTime', month] }, '$effectiveEarnings', 0] } }, previousMonthly: { $sum: { $cond: [{ $and: [{ $gte: ['$actualDeliveryTime', new Date(month.getFullYear(), month.getMonth() - 1, 1)] }, { $lt: ['$actualDeliveryTime', month] }] }, '$effectiveEarnings', 0] } }, net: { $sum: '$effectiveEarnings' }, commission: { $sum: '$effectiveCommission' } } }]),
      Order.aggregate([...pipeline, { $sort: { actualDeliveryTime: req.query.sortOrder === 'asc' ? 1 : -1 } }, { $facet: { rows: [{ $skip: (page - 1) * limit }, { $limit: limit }, { $project: { orderNumber: 1, customerName: '$customer.name', foodTotal: 1, deliveryFee: 1, commission: 1, restaurantEarnings: 1, paymentMethod: 1, paymentStatus: 1, date: '$actualDeliveryTime' } }], count: [{ $count: 'total' }] } }])
    ]);
    const summary = summaryRows[0] || { gross: 0, today: 0, yesterday: 0, weekly: 0, previousWeekly: 0, monthly: 0, previousMonthly: 0, net: 0, commission: 0 }; const transactions = transactionRows[0] || { rows: [], count: [] }; const total = transactions.count[0]?.total || 0;
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, data: { commissionRate: null, summary: { today: summary.today, weekly: summary.weekly, monthly: summary.monthly, total: summary.net, totalCommission: summary.commission, netEarnings: summary.net, withdrawableBalance: summary.net, remainingBalance: summary.net, trends: { today: percentChange(summary.today, summary.yesterday), weekly: percentChange(summary.weekly, summary.previousWeekly), monthly: percentChange(summary.monthly, summary.previousMonthly) } }, transactions: transactions.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message || 'Failed to load earnings' }); }
};
