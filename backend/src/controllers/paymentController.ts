import { Response } from 'express';
import { isValidObjectId, Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { Order, Payment, Restaurant } from '../models';
import { createCustomerOrderNotification, createCustomerPaymentNotification } from '../services/customerOrderNotificationService';
import { createRestaurantNotification } from '../services/notificationService';
import { publishOrderEvent } from '../services/orderEventService';

const onlineMethods = ['bkash', 'nagad', 'rocket'] as const;
type OnlineMethod = typeof onlineMethods[number];
const isOnlineMethod = (value: unknown): value is OnlineMethod => typeof value === 'string' && onlineMethods.some(method => method === value);
const phonePattern = /^(?:\+8801|01)[3-9]\d{8}$/;

const ownerRestaurant = (userId: string) => Restaurant.findOne({ owner: userId }).select('_id');

export const getAvailablePaymentMethods = async (req: AuthRequest, res: Response) => {
  if (!isValidObjectId(req.params.restaurantId)) return res.status(400).json({ success: false, message: 'Invalid restaurant ID' });
  const restaurant = await Restaurant.findOne({ _id: req.params.restaurantId, isActive: true }).select('name paymentMethods');
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
  // Never advertise a partially configured online method. This also safely
  // handles legacy restaurant records created before payment settings existed.
  const methods = {
    bkash: { ...restaurant.paymentMethods.bkash, enabled: restaurant.paymentMethods.bkash.enabled && phonePattern.test(restaurant.paymentMethods.bkash.phoneNumber) },
    nagad: { ...restaurant.paymentMethods.nagad, enabled: restaurant.paymentMethods.nagad.enabled && phonePattern.test(restaurant.paymentMethods.nagad.phoneNumber) },
    rocket: { ...restaurant.paymentMethods.rocket, enabled: restaurant.paymentMethods.rocket.enabled && phonePattern.test(restaurant.paymentMethods.rocket.phoneNumber) },
    cod: { enabled: restaurant.paymentMethods.cod.enabled },
  };
  res.json({ success: true, data: { restaurantId: restaurant._id, restaurantName: restaurant.name, paymentMethods: methods } });
};

export const submitPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, method, senderNumber, transactionId, amount } = req.body as Record<string, unknown>;
    if (typeof orderId !== 'string' || !isValidObjectId(orderId)) return res.status(400).json({ success: false, message: 'Valid order ID is required' });
    if (!isOnlineMethod(method)) return res.status(400).json({ success: false, message: 'Select a valid online payment method' });
    if (typeof senderNumber !== 'string' || !phonePattern.test(senderNumber.trim())) return res.status(400).json({ success: false, message: 'Enter a valid Bangladeshi sender number' });
    const normalizedTransactionId = typeof transactionId === 'string' ? transactionId.trim().toUpperCase() : '';
    if (!/^[A-Z0-9-]{5,50}$/.test(normalizedTransactionId)) return res.status(400).json({ success: false, message: 'Enter a valid transaction ID' });
    const paidAmount = typeof amount === 'number' ? amount : Number(amount);
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) return res.status(400).json({ success: false, message: 'Paid amount must be a positive number' });

    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.orderStatus === 'cancelled') return res.status(409).json({ success: false, message: 'Payment cannot be submitted for a cancelled order' });
    if (order.paymentMethod !== method) return res.status(409).json({ success: false, message: 'Payment method does not match this order' });
    if (Math.abs(order.totalAmount - paidAmount) > 0.009) return res.status(400).json({ success: false, message: `Paid amount must equal ৳${order.totalAmount.toFixed(2)}` });
    if (await Payment.exists({ orderId: order._id })) return res.status(409).json({ success: false, message: 'Payment information was already submitted for this order' });

    const restaurant = await Restaurant.findOne({ _id: order.restaurant, isActive: true }).select('paymentMethods');
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant is unavailable' });
    const receiver = restaurant.paymentMethods[method];
    if (!receiver.enabled || !phonePattern.test(receiver.phoneNumber)) return res.status(409).json({ success: false, message: `${method} is no longer available for this restaurant` });

    const payment = await Payment.create({ orderId: order._id, restaurantId: order.restaurant, customerId: req.user._id, method, receiverNumber: receiver.phoneNumber, receiverAccountType: receiver.accountType, senderNumber: senderNumber.trim(), transactionId: normalizedTransactionId, amount: paidAmount, status: 'submitted' });
    await Promise.allSettled([createRestaurantNotification({ restaurantId: order.restaurant.toString(), title: 'Payment Verification Required', message: `${req.user.name} submitted ${method.toUpperCase()} payment information for order #${order.orderNumber}.`, type: 'payment_submitted', orderId: order._id.toString(), metadata: { paymentId: payment._id.toString(), orderNumber: order.orderNumber, amount: paidAmount } })]);
    res.status(201).json({ success: true, message: 'Payment information submitted for manual verification', data: payment });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) return res.status(409).json({ success: false, message: 'This transaction ID or order already has a payment submission' });
    const message = error instanceof Error ? error.message : 'Failed to submit payment information';
    res.status(500).json({ success: false, message });
  }
};

export const getOrderPayment = async (req: AuthRequest, res: Response) => {
  const order = await Order.findOne({ _id: req.params.orderId, user: req.user._id }).select('_id');
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  const payment = await Payment.findOne({ orderId: order._id });
  res.json({ success: true, data: payment });
};

export const getRestaurantPayments = async (req: AuthRequest, res: Response) => {
  const restaurant = await ownerRestaurant(req.user._id);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
  const status = typeof req.query.status === 'string' ? req.query.status : 'all';
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const filter: { restaurantId: typeof restaurant._id; status?: string } = { restaurantId: restaurant._id };
  if (status !== 'all') filter.status = status;
  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('orderId', 'orderNumber items subtotal deliveryFee totalAmount orderStatus paymentStatus')
      .populate('customerId', 'name email phone')
      .populate('restaurantId', 'name restaurantId')
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Payment.countDocuments(filter)
  ]);
  res.json({ success: true, data: { payments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
};

const decidePayment = async (req: AuthRequest, res: Response, decision: 'verified' | 'rejected') => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid payment ID' });
  const restaurant = req.user.role === 'admin' ? null : await ownerRestaurant(req.user._id);
  if (req.user.role !== 'admin' && !restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

  // Verification has no request payload. Rejection has one explicit contract:
  // { reason: string }. Express leaves req.body undefined when PATCH is sent
  // without a body, so only inspect it for the operation that requires it.
  let reason = '';
  if (decision === 'rejected') {
    const body: unknown = req.body;
    if (typeof body !== 'object' || body === null || Array.isArray(body) || !('reason' in body)) {
      return res.status(400).json({ success: false, message: 'A rejection reason is required' });
    }
    const suppliedReason = body.reason;
    if (typeof suppliedReason !== 'string' || suppliedReason.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'A rejection reason is required' });
    }
    reason = suppliedReason.trim();
    if (reason.length > 500) {
      return res.status(400).json({ success: false, message: 'Rejection reason cannot exceed 500 characters' });
    }
  }

  const filter: { _id: string; status: 'submitted'; restaurantId?: Types.ObjectId } = { _id: req.params.id, status: 'submitted' };
  if (restaurant) filter.restaurantId = restaurant._id;
  const candidate = await Payment.findOne(filter);
  if (!candidate) return res.status(409).json({ success: false, message: 'Payment is unavailable, already processed, or belongs to another restaurant' });
  const order = await Order.findById(candidate.orderId);
  if (!order) return res.status(404).json({ success: false, message: 'Related order not found' });
  if (order.paymentMethod === 'cod') return res.status(409).json({ success: false, message: 'Cash on Delivery orders do not require payment verification' });
  if (decision === 'verified' && order.orderStatus === 'cancelled') return res.status(409).json({ success: false, message: 'A cancelled order payment cannot be verified' });
  const payment = await Payment.findOneAndUpdate(filter, { $set: { status: decision, verifiedBy: req.user._id, verifiedAt: new Date(), ...(decision === 'rejected' && { rejectionReason: reason }) } }, { new: true });
  if (!payment) return res.status(409).json({ success: false, message: 'Payment was already processed' });
  if (decision === 'verified') {
    order.paymentStatus = 'paid';
    order.orderStatus = 'pending';
  } else {
    order.paymentStatus = 'failed';
    order.orderStatus = 'payment_failed';
  }
  try { await order.save(); }
  catch (error) {
    await Payment.updateOne(
      { _id: payment._id, status: decision, verifiedBy: req.user._id },
      { $set: { status: 'submitted' }, $unset: { verifiedBy: 1, verifiedAt: 1, rejectionReason: 1 } }
    );
    throw error;
  }
  const notificationTasks: Promise<unknown>[] = [createCustomerPaymentNotification(order, decision === 'verified', reason)];
  if (decision === 'verified') {
    notificationTasks.push(
      createRestaurantNotification({ restaurantId: order.restaurant.toString(), title: 'New Order Received', message: `Verified order #${order.orderNumber} is ready for processing.`, type: 'new_order', orderId: order._id.toString(), metadata: { orderNumber: order.orderNumber, totalAmount: order.totalAmount } }),
      createRestaurantNotification({ restaurantId: order.restaurant.toString(), title: 'Payment Received', message: `Payment of ৳${payment.amount.toFixed(0)} was verified for order #${order.orderNumber}.`, type: 'payment_received', orderId: order._id.toString(), metadata: { orderNumber: order.orderNumber, amount: payment.amount } })
    );
  }
  await Promise.allSettled(notificationTasks);
  publishOrderEvent({ orderId: order._id.toString(), orderNumber: order.orderNumber, type: 'order_status_changed', status: order.orderStatus, occurredAt: new Date().toISOString() });
  res.json({ success: true, message: decision === 'verified' ? 'Payment verified and order activated' : 'Payment rejected', data: payment });
};

export const verifyPayment = (req: AuthRequest, res: Response) => decidePayment(req, res, 'verified');
export const rejectPayment = (req: AuthRequest, res: Response) => decidePayment(req, res, 'rejected');
