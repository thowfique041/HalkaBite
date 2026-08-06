import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { DeliveryProfile, Order } from '../models';
import { publishOrderEvent } from '../services/orderEventService';
import { createRestaurantNotification } from '../services/notificationService';

const populatedOrder = () => [
  { path: 'restaurant', select: 'name phone address image isActive isOpen' },
  { path: 'user', select: 'name phone' }
];

// `picked_up` is included only to recover orders created by the previous
// restaurant UI, which could bypass courier assignment. New orders use `ready`.
const queueStatus = { $in: ['ready', 'picked_up'] };
const unassignedCourier = {
  $or: [
    { deliveryPerson: { $exists: false } },
    { deliveryPerson: null }
  ]
};

const availableOrderFilter = (userId: string) => ({
  orderStatus: queueStatus,
  ...unassignedCourier,
  rejectedBy: { $nin: [userId] }
});

const invalidReason = (order: any) => {
  if (!order.user) return 'customer_missing' as const;
  if (!order.restaurant) return 'restaurant_missing' as const;
  if (order.restaurant.isActive === false) return 'restaurant_inactive' as const;
  if (order.restaurant.isOpen === false) return 'restaurant_unavailable' as const;
  return null;
};

const invalidateDeliveryOrders = async (orders: any[]) => {
  const invalidOrders = orders
    .map(order => ({ order, reason: invalidReason(order) }))
    .filter(entry => entry.reason);

  if (invalidOrders.length) {
    const invalidatedAt = new Date();
    await Order.bulkWrite(invalidOrders.map(({ order, reason }) => ({
      updateOne: {
        filter: {
          _id: order._id,
          orderStatus: { $in: ['ready', 'picked_up', 'out_for_delivery'] }
        },
        update: {
          $set: {
            orderStatus: 'cancelled',
            deliveryInvalidatedAt: invalidatedAt,
            deliveryInvalidReason: reason
          }
        }
      }
    })));
    invalidOrders.forEach(({ order, reason }) => publishOrderEvent({
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      type: 'delivery_order_invalidated',
      status: reason!,
      occurredAt: invalidatedAt.toISOString()
    }));
  }

  return orders.filter(order => !invalidReason(order));
};

const getValidAvailableOrders = async (userId: string) => {
  const candidates = await Order.find(availableOrderFilter(userId))
    .populate(populatedOrder())
    .sort({ createdAt: 1 });
  return invalidateDeliveryOrders(candidates);
};

const getProfile = (userId: string) => DeliveryProfile.findOneAndUpdate(
  { user: userId },
  { $setOnInsert: { user: userId } },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

export const getDeliveryDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id;
    const profile = await getProfile(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const week = new Date(today); week.setDate(week.getDate() - 6);
    const month = new Date(today.getFullYear(), today.getMonth(), 1);

    const [activeCandidate, availableOrders, earnings, historyCandidates] = await Promise.all([
      Order.findOne({ deliveryPerson: userId, orderStatus: 'out_for_delivery' }).populate(populatedOrder()),
      getValidAvailableOrders(userId),
      Order.aggregate([
        { $match: { deliveryPerson: userId, orderStatus: 'delivered' } },
        { $group: {
          _id: null,
          today: { $sum: { $cond: [{ $gte: ['$actualDeliveryTime', today] }, { $ifNull: ['$deliveryEarning', '$deliveryFee'] }, 0] } },
          weekly: { $sum: { $cond: [{ $gte: ['$actualDeliveryTime', week] }, { $ifNull: ['$deliveryEarning', '$deliveryFee'] }, 0] } },
          monthly: { $sum: { $cond: [{ $gte: ['$actualDeliveryTime', month] }, { $ifNull: ['$deliveryEarning', '$deliveryFee'] }, 0] } }
        } }
      ]),
      Order.find({ deliveryPerson: userId, orderStatus: { $in: ['delivered', 'cancelled'] } })
        .populate(populatedOrder()).sort({ updatedAt: -1 }).limit(20)
    ]);

    let activeOrder = activeCandidate;
    if (activeOrder && invalidReason(activeOrder)) {
      await invalidateDeliveryOrders([activeOrder]);
      activeOrder = null;
    }
    const history = historyCandidates.filter(order => !invalidReason(order));

    const income = earnings[0] || { today: 0, weekly: 0, monthly: 0 };
    res.json({ success: true, data: {
      profile,
      activeOrder,
      availableCount: availableOrders.length,
      todayOrders: history.filter((order: any) => order.actualDeliveryTime && order.actualDeliveryTime >= today).length,
      earnings: { ...income, bonus: profile.bonus, incentives: profile.incentives },
      history,
      reviews: []
    } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to load delivery dashboard' });
  }
};

export const getAvailableOrders = async (req: AuthRequest, res: Response) => {
  try {
    const profile = await getProfile(req.user._id);
    if (!profile.isOnline) {
      return res.json({ success: true, data: [] });
    }
    const orders = await getValidAvailableOrders(req.user._id);
    res.json({ success: true, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to load available orders' });
  }
};

export const toggleOnlineStatus = async (req: AuthRequest, res: Response) => {
  try {
    const profile = await getProfile(req.user._id);
    profile.isOnline = typeof req.body.isOnline === 'boolean' ? req.body.isOnline : !profile.isOnline;
    profile.lastActiveAt = new Date();
    await profile.save();
    publishOrderEvent({ orderId: req.user._id.toString(), type: 'delivery_presence_changed', status: profile.isOnline ? 'online' : 'offline', occurredAt: new Date().toISOString() });
    res.json({ success: true, message: `You are now ${profile.isOnline ? 'online' : 'offline'}`, data: profile });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update online status' });
  }
};

export const acceptOrder = async (req: AuthRequest, res: Response) => {
  try {
    const profile = await getProfile(req.user._id);
    if (!profile.isOnline) return res.status(400).json({ success: false, message: 'Go online before accepting orders' });
    const existingActive = await Order.findOne({ deliveryPerson: req.user._id, orderStatus: 'out_for_delivery' })
      .populate(populatedOrder());
    if (existingActive) {
      if (invalidReason(existingActive)) await invalidateDeliveryOrders([existingActive]);
      else return res.status(400).json({ success: false, message: 'Complete your active delivery first' });
    }

    const candidate = await Order.findOne({ _id: req.params.id, ...availableOrderFilter(req.user._id) })
      .populate(populatedOrder());
    if (!candidate) return res.status(409).json({ success: false, message: 'Order is no longer available' });
    const reason = invalidReason(candidate);
    if (reason) {
      await invalidateDeliveryOrders([candidate]);
      return res.status(410).json({ success: false, message: 'Order is invalid because its customer or restaurant is unavailable' });
    }

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, ...availableOrderFilter(req.user._id) },
      {
        $set: {
          deliveryPerson: req.user._id,
          deliveryStatus: 'accepted',
          orderStatus: 'out_for_delivery',
          deliveryEarning: 50,
          deliveryManSnapshot: { id: req.user._id.toString(), name: req.user.name },
          assignedAt: new Date()
        },
        $push: {
          deliveryAuditTrail: {
            event: 'assigned',
            status: 'accepted',
            deliveryManId: req.user._id.toString(),
            deliveryManName: req.user.name,
            at: new Date()
          }
        }
      },
      { new: true }
    ).populate(populatedOrder());
    if (!order) return res.status(409).json({ success: false, message: 'Order is no longer available' });
    await DeliveryProfile.findOneAndUpdate({ user: req.user._id }, { lastActiveAt: new Date() });
    publishOrderEvent({ orderId: order._id.toString(), orderNumber: order.orderNumber, type: 'delivery_assigned', status: 'accepted', occurredAt: new Date().toISOString() });
    await createRestaurantNotification({
      restaurantId: (order.restaurant as any)._id.toString(), title: 'Delivery Partner Assigned',
      message: `Order #${order.orderNumber} was assigned to ${req.user.name} (${req.user._id}).`,
      type: 'delivery_assigned', orderId: order._id.toString(),
      metadata: { orderNumber: order.orderNumber, deliveryManName: req.user.name, deliveryManId: req.user._id.toString() }
    });
    res.json({ success: true, message: 'Order accepted', data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to accept order' });
  }
};

export const rejectOrder = async (req: AuthRequest, res: Response) => {
  try {
    await Order.findOneAndUpdate(
      { _id: req.params.id, ...availableOrderFilter(req.user._id) },
      { $addToSet: { rejectedBy: req.user._id } }
    );
    res.json({ success: true, message: 'Order rejected' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to reject order' });
  }
};

export const updateDeliveryStatus = async (req: AuthRequest, res: Response) => {
  try {
    const allowed = ['going_to_restaurant', 'picked_up', 'on_the_way', 'delivered'];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ success: false, message: 'Invalid delivery status' });
    const activeCandidate = await Order.findOne({
      _id: req.params.id,
      deliveryPerson: req.user._id,
      orderStatus: 'out_for_delivery'
    }).populate(populatedOrder());
    if (!activeCandidate) return res.status(404).json({ success: false, message: 'Active order not found' });
    if (invalidReason(activeCandidate)) {
      await invalidateDeliveryOrders([activeCandidate]);
      return res.status(410).json({ success: false, message: 'Delivery was cancelled because its customer or restaurant is unavailable' });
    }
    const paymentWasPaid = activeCandidate.paymentStatus === 'paid';
    const update: any = { deliveryStatus: req.body.status };
    const now = new Date();
    if (req.body.status === 'picked_up') update.pickupTime = now;
    if (req.body.status === 'delivered') {
      update.orderStatus = 'delivered';
      update.actualDeliveryTime = now;
      update.paymentStatus = 'paid';
    }
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, deliveryPerson: req.user._id, orderStatus: 'out_for_delivery' },
      {
        $set: update,
        $push: {
          deliveryAuditTrail: {
            event: 'status_changed',
            status: req.body.status,
            deliveryManId: req.user._id.toString(),
            deliveryManName: req.user.name,
            at: now
          }
        }
      },
      { new: true }
    ).populate(populatedOrder());
    if (!order) return res.status(404).json({ success: false, message: 'Active order not found' });
    await DeliveryProfile.findOneAndUpdate({ user: req.user._id }, { lastActiveAt: now });
    publishOrderEvent({ orderId: order._id.toString(), orderNumber: order.orderNumber, type: 'delivery_status_changed', status: req.body.status, occurredAt: now.toISOString() });
    if (req.body.status === 'picked_up' || req.body.status === 'delivered') {
      await createRestaurantNotification({
        restaurantId: (order.restaurant as any)._id.toString(),
        title: req.body.status === 'picked_up' ? 'Order Picked Up' : 'Order Delivered',
        message: req.body.status === 'picked_up'
          ? `Order #${order.orderNumber} was picked up by ${req.user.name} (${req.user._id}).`
          : `Order #${order.orderNumber} was successfully delivered.`,
        type: req.body.status === 'picked_up' ? 'order_picked_up' : 'order_delivered',
        orderId: order._id.toString(), metadata: { orderNumber: order.orderNumber, deliveryManName: req.user.name, deliveryManId: req.user._id.toString() }
      });
    }
    if (req.body.status === 'delivered' && !paymentWasPaid) {
      await createRestaurantNotification({
        restaurantId: (order.restaurant as any)._id.toString(), title: 'Payment Received',
        message: `Payment of ৳${order.totalAmount.toFixed(0)} was completed for order #${order.orderNumber}.`,
        type: 'payment_received', orderId: order._id.toString(), metadata: { orderNumber: order.orderNumber, amount: order.totalAmount }
      });
    }
    if (req.body.status === 'delivered') {
      const completed = await Order.countDocuments({ restaurant: (order.restaurant as any)._id, orderStatus: 'delivered' });
      if (completed > 0 && completed % 100 === 0) {
        await createRestaurantNotification({
          restaurantId: (order.restaurant as any)._id.toString(), title: 'Congratulations!',
          message: `You have completed ${completed} orders. Keep growing!`, type: 'milestone',
          metadata: { completedOrders: completed }
        });
      }
    }
    res.json({ success: true, message: 'Delivery status updated', data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update delivery status' });
  }
};

export const updateDeliveryProfile = async (req: AuthRequest, res: Response) => {
  try {
    const allowed = ['vehicleType', 'vehicleNumber', 'licenseNumber', 'nidNumber', 'payoutMethod', 'payoutAccount', 'currentLocation'];
    const update = {
      ...Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key))),
      lastActiveAt: new Date()
    };
    const profile = await DeliveryProfile.findOneAndUpdate(
      { user: req.user._id },
      { $set: update, $setOnInsert: { user: req.user._id } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, message: 'Delivery profile updated', data: profile });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update profile' });
  }
};
