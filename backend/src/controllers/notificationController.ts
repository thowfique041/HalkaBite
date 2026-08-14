import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { Notification, Restaurant } from '../models';
import notificationEmitter, { createRestaurantNotification, restaurantNotificationChannel } from '../services/notificationService';
import { openSseStream } from '../utils/sse';

const ownedRestaurant = (userId: string) => Restaurant.findOne({ owner: userId }).select('_id');

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const restaurant = await ownedRestaurant(req.user._id);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const query: any = { restaurantId: restaurant._id };
    if (req.query.type && req.query.type !== 'all') query.type = req.query.type;
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Notification.countDocuments(query),
      Notification.countDocuments({ restaurantId: restaurant._id, isRead: false })
    ]);
    res.json({ success: true, data: { notifications, unreadCount, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message || 'Failed to load notifications' }); }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  const restaurant = await ownedRestaurant(req.user._id);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, restaurantId: restaurant._id }, { isRead: true }, { new: true }
  );
  if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
  res.json({ success: true, data: notification });
};

export const markDisplayedAsRead = async (req: AuthRequest, res: Response) => {
  const restaurant = await ownedRestaurant(req.user._id);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
  const rawIds: unknown[] = Array.isArray(req.body.ids) ? req.body.ids : [];
  const validIds = new Map<string, Types.ObjectId>();
  for (const rawId of rawIds) {
    if (typeof rawId !== 'string' || !Types.ObjectId.isValid(rawId)) continue;
    const objectId = new Types.ObjectId(rawId);
    validIds.set(objectId.toHexString(), objectId);
    if (validIds.size === 50) break;
  }
  const ids: Types.ObjectId[] = Array.from(validIds.values());
  if (!ids.length) return res.status(400).json({ success: false, message: 'Notification IDs are required' });
  const result = await Notification.updateMany(
    { _id: { $in: ids }, restaurantId: restaurant._id, isRead: false },
    { $set: { isRead: true } }
  );
  const unreadCount = await Notification.countDocuments({ restaurantId: restaurant._id, isRead: false });
  res.json({ success: true, data: { updatedCount: result.modifiedCount, unreadCount } });
};

export const deleteNotification = async (req: AuthRequest, res: Response) => {
  const restaurant = await ownedRestaurant(req.user._id);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
  const deleted = await Notification.findOneAndDelete({ _id: req.params.id, restaurantId: restaurant._id });
  if (!deleted) return res.status(404).json({ success: false, message: 'Notification not found' });
  res.json({ success: true, message: 'Notification deleted' });
};

export const clearNotifications = async (req: AuthRequest, res: Response) => {
  const restaurant = await ownedRestaurant(req.user._id);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
  await Notification.deleteMany({ restaurantId: restaurant._id });
  res.json({ success: true, message: 'Notifications cleared' });
};

export const streamNotifications = async (req: AuthRequest, res: Response) => {
  const restaurant = await ownedRestaurant(req.user._id);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
  const stream = openSseStream(req, res);
  const channel = restaurantNotificationChannel(restaurant._id.toString());
  const send = (notification: unknown) => stream.send(notification, 'notification');
  notificationEmitter.on(channel, send);
  stream.send({ connected: true }, 'connected');
  stream.onClose(() => notificationEmitter.off(channel, send));
};

export const createAnnouncement = async (req: AuthRequest, res: Response) => {
  const { restaurantId, title = 'Admin Announcement', message } = req.body;
  if (!restaurantId || !message?.trim()) return res.status(400).json({ success: false, message: 'restaurantId and message are required' });
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
  const notification = await createRestaurantNotification({ restaurantId, title, message: message.trim(), type: 'admin_announcement' });
  res.status(201).json({ success: true, data: notification });
};
