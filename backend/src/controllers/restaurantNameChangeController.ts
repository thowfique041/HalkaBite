import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Restaurant, RestaurantNameChangeRequest, User } from '../models';
import { ensureRestaurantIdentity } from '../services/restaurantIdentityService';
import { createRestaurantNotification } from '../services/notificationService';

const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const ownedRestaurant = (owner: string) => Restaurant.findOne({ owner });

export const verifyRestaurantPassword = async (req: AuthRequest, res: Response) => {
  const password = clean(req.body.password, 200);
  if (!password) return res.status(400).json({ success: false, message: 'Current password is required' });
  const user = await User.findById(req.user._id).select('+password');
  if (!user || !(await user.comparePassword(password))) return res.status(401).json({ success: false, message: 'Current password is incorrect' });
  return res.json({ success: true, message: 'Identity verified' });
};

export const submitRestaurantNameChange = async (req: AuthRequest, res: Response) => {
  try {
    const password = clean(req.body.password, 200), requestedName = clean(req.body.requestedName, 100), reason = clean(req.body.reason, 500);
    if (!password || requestedName.length < 2 || !reason) return res.status(400).json({ success: false, message: 'Current password, a valid new name, and reason are required' });
    const user = await User.findById(req.user._id).select('+password');
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    const restaurant = await ownedRestaurant(req.user._id);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant profile not found' });
    await ensureRestaurantIdentity(restaurant);
    if (restaurant.name.trim().toLowerCase() === requestedName.toLowerCase()) return res.status(400).json({ success: false, message: 'The requested name is the same as the current name' });
    if (await RestaurantNameChangeRequest.exists({ restaurant: restaurant._id, status: 'pending' })) return res.status(409).json({ success: false, message: 'A name change request is already pending' });
    const request = await RestaurantNameChangeRequest.create({ restaurant: restaurant._id, restaurantId: restaurant.restaurantId, oldName: restaurant.name, requestedName, requestedBy: req.user._id, reason });
    await createRestaurantNotification({ restaurantId: restaurant._id.toString(), title: 'Name Change Request Pending', message: 'Your restaurant name change request has been submitted.', type: 'identity_update', metadata: { requestId: request._id, status: 'pending' } });
    return res.status(201).json({ success: true, message: 'Name change request submitted for admin approval', data: request });
  } catch (error: any) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: 'A name change request is already pending' });
    return res.status(500).json({ success: false, message: error.message || 'Unable to submit request' });
  }
};

export const getMyNameChangeRequests = async (req: AuthRequest, res: Response) => {
  const restaurant = await ownedRestaurant(req.user._id);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant profile not found' });
  await ensureRestaurantIdentity(restaurant);
  const requests = await RestaurantNameChangeRequest.find({ restaurant: restaurant._id }).sort({ requestedAt: -1 }).lean();
  return res.json({ success: true, data: { restaurantId: restaurant.restaurantId, currentName: restaurant.name, requests } });
};

export const getAllNameChangeRequests = async (req: AuthRequest, res: Response) => {
  const status = ['pending', 'approved', 'rejected'].includes(String(req.query.status)) ? req.query.status : undefined;
  const requests = await RestaurantNameChangeRequest.find(status ? { status } : {}).populate('requestedBy', 'name email').populate('approvedBy', 'name email').sort({ requestedAt: -1 }).lean();
  return res.json({ success: true, data: requests });
};

export const decideNameChangeRequest = async (req: AuthRequest, res: Response) => {
  const status = req.body.status;
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ success: false, message: 'Decision must be approved or rejected' });
  const request = await RestaurantNameChangeRequest.findOneAndUpdate({ _id: req.params.id, status: 'pending' }, { $set: { status, approvedBy: req.user._id, approvalDate: new Date() } }, { new: true });
  if (!request) return res.status(404).json({ success: false, message: 'Pending request not found or already decided' });
  const restaurant = await Restaurant.findById(request.restaurant);
  if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant no longer exists; audit record retained' });
  if (status === 'approved') { restaurant.name = request.requestedName; await restaurant.save(); request.approvedName = restaurant.name; await request.save(); }
  await createRestaurantNotification({ restaurantId: restaurant._id.toString(), title: status === 'approved' ? 'Restaurant Name Updated' : 'Name Change Request Rejected', message: status === 'approved' ? 'Your restaurant name has been updated successfully.' : 'Your restaurant name change request was rejected.', type: 'identity_update', metadata: { requestId: request._id, status } });
  return res.json({ success: true, message: `Request ${status}`, data: request });
};
