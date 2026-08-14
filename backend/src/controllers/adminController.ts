import { Request, Response } from 'express';
import { DeliveryProfile, DeliveryWallet, Order, Restaurant, User } from '../models';

export const getDashboardOverview = async (_req: Request, res: Response) => {
  try {
    const revenueStatuses = { $nin: ['pending', 'cancelled'] };

    const [totalUsers, totalRestaurants, totalOrders, revenueResult, recentOrders, popularRestaurants] = await Promise.all([
      User.countDocuments(),
      Restaurant.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([
        { $match: { orderStatus: revenueStatuses } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
      ]),
      Order.find()
        .select('orderNumber totalAmount orderStatus createdAt')
        .populate('user', 'name')
        .populate('restaurant', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Order.aggregate([
        { $match: { orderStatus: revenueStatuses } },
        {
          $group: {
            _id: '$restaurant',
            orderCount: { $sum: 1 },
            revenue: { $sum: '$totalAmount' }
          }
        },
        { $sort: { orderCount: -1, revenue: -1 } },
        { $limit: 3 },
        {
          $lookup: {
            from: 'restaurants',
            localField: '_id',
            foreignField: '_id',
            as: 'restaurant'
          }
        },
        { $unwind: '$restaurant' },
        {
          $project: {
            _id: '$restaurant._id',
            name: '$restaurant.name',
            image: '$restaurant.image',
            orderCount: 1,
            revenue: 1
          }
        }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalRestaurants,
        totalOrders,
        totalRevenue: revenueResult[0]?.totalRevenue || 0,
        recentActivity: recentOrders,
        popularRestaurants
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching dashboard overview'
    });
  }
};

const buildDeliveryManagement = async () => {
  const deliveryUsers = await User.find({ role: 'delivery' }).select('name email phone avatar').lean();
  const userIds = deliveryUsers.map(user => user._id);
  const [profiles, orders] = await Promise.all([
    DeliveryProfile.find({ user: { $in: userIds } }).lean(),
    Order.find({ deliveryPerson: { $in: userIds } })
      .select('orderNumber deliveryPerson orderStatus deliveryStatus deliveryEarning deliveryFee actualDeliveryTime createdAt updatedAt restaurant user totalAmount')
      .populate('restaurant', 'name')
      .populate('user', 'name phone')
      .sort({ updatedAt: -1 })
      .lean()
  ]);
  const profileMap = new Map(profiles.map(profile => [profile.user.toString(), profile]));
  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const week = new Date(today); week.setDate(week.getDate() - 6);
  const month = new Date(today.getFullYear(), today.getMonth(), 1);

  const deliveryMen = deliveryUsers.map(user => {
    const id = user._id.toString();
    const profile = profileMap.get(id);
    const assignedOrders = orders.filter(order => order.deliveryPerson?.toString() === id);
    const completed = assignedOrders.filter(order => order.orderStatus === 'delivered');
    const cancelled = assignedOrders.filter(order => order.orderStatus === 'cancelled');
    const active = assignedOrders.filter(order => order.orderStatus === 'out_for_delivery');
    const earning = (order: any) => order.deliveryEarning ?? order.deliveryFee ?? 0;
    const status = active.length ? 'busy' : profile?.isOnline ? 'online' : 'offline';
    return {
      _id: id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      vehicleType: profile?.vehicleType || '',
      vehicleNumber: profile?.vehicleNumber || '',
      status,
      isOnline: profile?.isOnline || false,
      assignedOrders: assignedOrders.length,
      completedDeliveries: completed.length,
      cancelledDeliveries: cancelled.length,
      totalEarnings: completed.reduce((sum, order) => sum + earning(order), 0),
      todayEarnings: completed.filter(order => order.actualDeliveryTime && order.actualDeliveryTime >= today).reduce((sum, order) => sum + earning(order), 0),
      weeklyEarnings: completed.filter(order => order.actualDeliveryTime && order.actualDeliveryTime >= week).reduce((sum, order) => sum + earning(order), 0),
      monthlyEarnings: completed.filter(order => order.actualDeliveryTime && order.actualDeliveryTime >= month).reduce((sum, order) => sum + earning(order), 0),
      rating: profile?.rating || 0,
      reviewCount: profile?.reviewCount || 0,
      lastActiveAt: profile?.lastActiveAt || null,
      profile,
      orders: assignedOrders
    };
  });
  return deliveryMen;
};

export const getDeliveryManagement = async (req: Request, res: Response) => {
  try {
    const allDeliveryMen = await buildDeliveryManagement();
    const totalDeliveries = allDeliveryMen.reduce((sum, man) => sum + man.completedDeliveries, 0);
    const totalDeliveryEarnings = allDeliveryMen.reduce((sum, man) => sum + man.totalEarnings, 0);
    const [chargeRows,walletRows]=await Promise.all([Order.aggregate([{$match:{orderStatus:'delivered',deliveryPerson:{$exists:true}}},{$group:{_id:null,charges:{$sum:'$deliveryFee'}}}]),DeliveryWallet.aggregate([{$group:{_id:null,paid:{$sum:'$paidEarnings'},pending:{$sum:'$pendingEarnings'}}}])]);
    const deliveryChargesCollected=chargeRows[0]?.charges||0,totalPaidToDeliveryMen=walletRows[0]?.paid||0,pendingDeliveryPayments=walletRows[0]?.pending||0;
    const summary = {
      totalDeliveryMen: allDeliveryMen.length,
      activeDeliveryMen: allDeliveryMen.filter(man => man.isOnline).length,
      offlineDeliveryMen: allDeliveryMen.filter(man => !man.isOnline).length,
      busyDeliveryMen: allDeliveryMen.filter(man => man.status === 'busy').length,
      availableDeliveryMen: allDeliveryMen.filter(man => man.status === 'online').length,
      totalDeliveries,
      totalDeliveryEarnings,
      deliveryChargesCollected,
      totalPaidToDeliveryMen,
      pendingDeliveryPayments,
      platformDeliveryMargin: deliveryChargesCollected-totalDeliveryEarnings,
      averageDeliveriesPerDeliveryMan: allDeliveryMen.length ? totalDeliveries / allDeliveryMen.length : 0,
      topPerformers: [...allDeliveryMen].sort((a, b) => b.completedDeliveries - a.completedDeliveries || b.rating - a.rating).slice(0, 5),
      recentlyActive: [...allDeliveryMen].filter(man => man.lastActiveAt).sort((a, b) => new Date(b.lastActiveAt!).getTime() - new Date(a.lastActiveAt!).getTime()).slice(0, 5)
    };

    const search = String(req.query.search || '').toLowerCase();
    const status = String(req.query.status || 'all');
    const sort = String(req.query.sort || 'recent');
    let deliveryMen = allDeliveryMen.filter(man =>
      (!search || man.name.toLowerCase().includes(search) || man.email.toLowerCase().includes(search) || man._id.toLowerCase().includes(search)) &&
      (status === 'all' || man.status === status)
    );
    const sorters: Record<string, (a: any, b: any) => number> = {
      completed: (a, b) => b.completedDeliveries - a.completedDeliveries,
      earnings: (a, b) => b.totalEarnings - a.totalEarnings,
      rating: (a, b) => b.rating - a.rating,
      recent: (a, b) => new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime()
    };
    deliveryMen = deliveryMen.sort(sorters[sort] || sorters.recent);
    res.json({ success: true, data: { summary, deliveryMen } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to load delivery management' });
  }
};

export const getDeliveryManDetails = async (req: Request, res: Response) => {
  try {
    const deliveryMen = await buildDeliveryManagement();
    const deliveryMan = deliveryMen.find(man => man._id === req.params.id);
    if (!deliveryMan) return res.status(404).json({ success: false, message: 'Delivery man not found' });
    res.json({ success: true, data: deliveryMan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to load delivery man' });
  }
};
