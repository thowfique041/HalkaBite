import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Notification, Restaurant } from '../models';
import notificationEmitter, { createRestaurantNotification, restaurantNotificationChannel } from '../services/notificationService';

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

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  const restaurant = await ownedRestaurant(req.user._id);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
  await Notification.updateMany({ restaurantId: restaurant._id, isRead: false }, { isRead: true });
  res.json({ success: true, message: 'All notifications marked as read' });
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
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  const channel = restaurantNotificationChannel(restaurant._id.toString());
  const send = (notification: unknown) => res.write(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`);
  notificationEmitter.on(channel, send);
  res.write(`event: connected\ndata: {"connected":true}\n\n`);
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25000);
  req.on('close', () => { clearInterval(heartbeat); notificationEmitter.off(channel, send); });
};

export const createAnnouncement = async (req: AuthRequest, res: Response) => {
  const { restaurantId, title = 'Admin Announcement', message } = req.body;
  if (!restaurantId || !message?.trim()) return res.status(400).json({ success: false, message: 'restaurantId and message are required' });
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
  const notification = await createRestaurantNotification({ restaurantId, title, message: message.trim(), type: 'admin_announcement' });
  res.status(201).json({ success: true, data: notification });
};
