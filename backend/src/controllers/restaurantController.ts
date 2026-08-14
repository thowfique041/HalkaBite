import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Restaurant, FoodItem, Order, User } from '../models';
import { AuthRequest } from '../middleware/auth';
import { ensureRestaurantIdentity } from '../services/restaurantIdentityService';
import { changeRestaurantStatus, logRestaurantActivity } from '../services/restaurantActivityService';

const RESTAURANT_PROFILE_FIELDS = [
  'name', 'description', 'address', 'phone', 'email', 'image', 'coverImage', 'cuisine',
  'deliveryTime', 'deliveryFee', 'minimumOrder', 'deliveryRadius', 'isOpen', 'acceptingOrders',
  'weeklyHoliday', 'openingHours', 'notificationPreferences'
  , 'paymentMethods'
] as const;

const pickRestaurantProfile = (body: Record<string, unknown>) => Object.fromEntries(
  RESTAURANT_PROFILE_FIELDS
    .filter(field => body[field] !== undefined)
    .map(field => [field, body[field]])
);

// @desc    Get all restaurants
// @route   GET /api/restaurants
// @access  Public
export const getAllRestaurants = async (req: Request, res: Response) => {
  try {
    const { search, cuisine, city, isOpen, sort, page = 1, limit = 12 } = req.query;

    const query: any = { isActive: true };

    if (cuisine) query.cuisine = { $in: (cuisine as string).split(',') };
    if (city) query['address.city'] = new RegExp(city as string, 'i');
    if (isOpen === 'true') query.isOpen = true;

    if (search) {
      query.$text = { $search: search as string };
    }

    let sortOption: any = { rating: -1 };
    if (sort === 'deliveryTime') sortOption = { deliveryTime: 1 };
    if (sort === 'deliveryFee') sortOption = { deliveryFee: 1 };

    const skip = (Number(page) - 1) * Number(limit);

    const [restaurants, total] = await Promise.all([
      Restaurant.find(query)
        .select('-paymentMethods')
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit)),
      Restaurant.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        restaurants,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Get single restaurant with menu
// @route   GET /api/restaurants/:id
// @access  Public
export const getRestaurant = async (req: Request, res: Response) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).select('-paymentMethods');

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // Get menu items
    const menuItems = await FoodItem.find({
      restaurant: req.params.id,
      isAvailable: true,
      isDeleted: { $ne: true }
    }).populate('category', 'name');

    // Group by category
    const menuByCategory = menuItems.reduce((acc: any, item) => {
      const categoryName = (item.category as any)?.name || 'Other';
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(item);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        restaurant,
        menu: menuByCategory
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Create restaurant
// @route   POST /api/restaurants
// @access  Private/Restaurant role (self-profile creation)
export const createRestaurant = async (req: AuthRequest, res: Response) => {
  try {
    // Restaurant-role users can only create one restaurant (their own).
    const existing = await Restaurant.findOne({ owner: req.user._id });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You already have a restaurant profile'
      });
    }

    const restaurant = await Restaurant.create({
      ...pickRestaurantProfile(req.body),
      email: typeof req.body.email === 'string' ? req.body.email : req.user.email,
      owner: req.user._id,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Restaurant created successfully',
      data: restaurant
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Update restaurant
// @route   PUT /api/restaurants/:id
// @access  Private/Admin or owning Restaurant user
export const updateRestaurant = async (req: AuthRequest, res: Response) => {
  try {
    const existingRestaurant = await Restaurant.findById(req.params.id);

    if (!existingRestaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    if (
      req.user.role === 'restaurant' &&
      existingRestaurant.owner.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own restaurant'
      });
    }

    const updateData = req.user.role === 'restaurant'
      ? pickRestaurantProfile(req.body)
      : { ...req.body };
    delete (updateData as any).owner;
    delete (updateData as any).rating;
    delete (updateData as any).reviewCount;
    delete (updateData as any).name;
    delete (updateData as any).restaurantId;
    if (req.user.role === 'restaurant') delete (updateData as any).isActive;

    const restaurant = await Restaurant.findByIdAndUpdate(
      existingRestaurant._id,
      updateData,
      { new: true, runValidators: true }
    );
    if (req.user.role === 'restaurant') {
      await logRestaurantActivity(restaurant!._id.toString(), 'settings_updated', 'Restaurant settings were updated.', req.user._id.toString());
      if (existingRestaurant.isOpen !== restaurant!.isOpen) await changeRestaurantStatus(restaurant!._id.toString(), restaurant!.isOpen ? 'open' : 'closed', req.user._id.toString());
      else if (existingRestaurant.acceptingOrders !== restaurant!.acceptingOrders) await changeRestaurantStatus(restaurant!._id.toString(), restaurant!.acceptingOrders ? 'active' : 'temporarily_closed', req.user._id.toString());
    }

    res.status(200).json({
      success: true,
      message: 'Restaurant updated successfully',
      data: restaurant
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Delete restaurant
// @route   DELETE /api/restaurants/:id
// @access  Private/Admin
export const deleteRestaurant = async (req: Request, res: Response) => {
  try {
    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // Also delete all food items
    await FoodItem.deleteMany({ restaurant: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Restaurant deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Toggle restaurant open/close
// @route   PUT /api/restaurants/:id/toggle
// @access  Private/Admin
export const toggleRestaurantStatus = async (req: Request, res: Response) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    restaurant.isOpen = !restaurant.isOpen;
    await restaurant.save();

    res.status(200).json({
      success: true,
      message: `Restaurant is now ${restaurant.isOpen ? 'open' : 'closed'}`,
      data: restaurant
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Get my restaurant (for restaurant owners)
// @route   GET /api/restaurants/my-restaurant
// @access  Private/Restaurant Owner
export const getMyRestaurant = async (req: AuthRequest, res: Response) => {
  try {
    // Find restaurant owned by current user
    const restaurant = await Restaurant.findOne({ owner: req.user._id });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'No restaurant found for this account'
      });
    }
    await ensureRestaurantIdentity(restaurant);

    res.status(200).json({
      success: true,
      data: restaurant
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const updateMyRestaurantSettings = async (req: AuthRequest, res: Response) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    const update = pickRestaurantProfile(req.body);
    delete (update as any).name;
    delete (update as any).restaurantId;
    const email = typeof update.email === 'string' ? update.email.trim().toLowerCase() : undefined;
    const phone = typeof update.phone === 'string' ? update.phone.trim() : undefined;
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ success: false, message: 'Enter a valid email address' });
    if (phone && !/^(\+880|0)?1[3-9]\d{8}$/.test(phone)) return res.status(400).json({ success: false, message: 'Enter a valid Bangladeshi phone number' });
    if (email) {
      const conflict = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (conflict) return res.status(409).json({ success: false, message: 'Email is already used by another account' });
    }
    if (update.address && typeof update.address === 'object') {
      const address = update.address as any;
      if (!address.street?.trim() || !address.city?.trim() || !address.state?.trim() || !address.zipCode?.trim()) return res.status(400).json({ success: false, message: 'Complete all required address fields' });
      const lat = address.coordinates?.lat; const lng = address.coordinates?.lng;
      if ((lat !== undefined && (lat < -90 || lat > 90)) || (lng !== undefined && (lng < -180 || lng > 180))) return res.status(400).json({ success: false, message: 'Invalid map coordinates' });
      const clean = (value: unknown, max = 300) => typeof value === 'string' ? value.replace(/[<>\x00-\x1F]/g, '').trim().slice(0, max) : value;
      update.address = {
        restaurantAddress: clean(address.restaurantAddress), area: clean(address.area), street: clean(address.street),
        city: clean(address.city), district: clean(address.district), state: clean(address.state), zipCode: clean(address.zipCode, 30),
        country: clean(address.country), coordinates: { ...(lat !== undefined && { lat: Number(lat) }), ...(lng !== undefined && { lng: Number(lng) }) }
      };
    }
    if (update.openingHours && !Array.isArray(update.openingHours)) return res.status(400).json({ success: false, message: 'Invalid business hours' });
    if (update.paymentMethods !== undefined) {
      if (!update.paymentMethods || typeof update.paymentMethods !== 'object' || Array.isArray(update.paymentMethods)) return res.status(400).json({ success: false, message: 'Invalid payment settings' });
      const input = update.paymentMethods as Record<string, unknown>;
      const onlineMethods = ['bkash', 'nagad', 'rocket'] as const;
      const normalized: Record<string, unknown> = {};
      for (const method of onlineMethods) {
        const value = input[method];
        if (!value || typeof value !== 'object' || Array.isArray(value)) return res.status(400).json({ success: false, message: `Invalid ${method} settings` });
        const config = value as Record<string, unknown>;
        const enabled = config.enabled === true;
        const phoneNumber = typeof config.phoneNumber === 'string' ? config.phoneNumber.trim() : '';
        const accountType = config.accountType === 'Agent' ? 'Agent' : 'Personal';
        if (enabled && !/^(?:\+8801|01)[3-9]\d{8}$/.test(phoneNumber)) return res.status(400).json({ success: false, message: `Enter a valid Bangladeshi ${method} number` });
        normalized[method] = { enabled, phoneNumber, accountType };
      }
      const cod = input.cod && typeof input.cod === 'object' && !Array.isArray(input.cod) ? input.cod as Record<string, unknown> : {};
      normalized.cod = { enabled: cod.enabled === true };
      update.paymentMethods = normalized;
    }
    const previousOpen = restaurant.isOpen;
    const previousAcceptingOrders = restaurant.acceptingOrders;
    Object.assign(restaurant, update);
    await restaurant.save();
    await logRestaurantActivity(restaurant._id.toString(), 'settings_updated', 'Restaurant owner updated settings.', req.user._id.toString());
    if (previousOpen !== restaurant.isOpen) await changeRestaurantStatus(restaurant._id.toString(), restaurant.isOpen ? 'open' : 'closed', req.user._id.toString());
    else if (previousAcceptingOrders !== restaurant.acceptingOrders) await changeRestaurantStatus(restaurant._id.toString(), restaurant.acceptingOrders ? 'active' : 'temporarily_closed', req.user._id.toString());
    if (email || phone) await User.findByIdAndUpdate(req.user._id, { ...(email && { email }), ...(phone && { phone }) }, { runValidators: true });
    res.json({ success: true, message: 'Restaurant settings updated successfully', data: restaurant });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update settings' });
  }
};

// @desc    Get orders for a specific restaurant
// @route   GET /api/restaurants/:id/orders
// @access  Private/Restaurant Owner
export const getRestaurantOrders = async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.params.id;

    // Check if restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }
    if (req.user.role === 'restaurant' && restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only view orders for your own restaurant' });
    }

    const { status, page = 1, limit = 20 } = req.query;

    const query: any = {
      restaurant: restaurantId,
      $or: [{ paymentMethod: 'cod' }, { paymentStatus: 'paid' }],
      orderStatus: { $nin: ['payment_pending', 'payment_failed'] }
    };
    if (status && status !== 'all') {
      query.orderStatus = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .select('-deliveryEarning -deliveryPlatformShare -deliveryEarningMode -deliveryEarningValue -deliveryEarningStatus -deliverySettlement')
        .populate('user', 'name email phone')
        .populate('deliveryPerson', 'name phone avatar')
        .populate('items.foodItem', 'name image price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Get restaurant statistics
// @route   GET /api/restaurants/:id/stats
// @access  Private/Restaurant Owner
export const getRestaurantStats = async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.params.id;
    if (!mongoose.isValidObjectId(restaurantId)) {
      return res.status(400).json({ success: false, message: 'Invalid restaurant ID' });
    }
    const restaurant = await Restaurant.findById(restaurantId).select('owner');
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    if (req.user.role === 'restaurant' && restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only view analytics for your own restaurant' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
    const [totals, pendingOrders, menuItems, popularItems] = await Promise.all([
      Order.aggregate([
        { $match: { restaurant: restaurantObjectId, orderStatus: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            todayOrders: { $sum: { $cond: [{ $gte: ['$createdAt', today] }, 1, 0] } },
            totalRevenue: { $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, '$totalAmount', 0] } },
            todayRevenue: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$orderStatus', 'delivered'] }, { $gte: ['$actualDeliveryTime', today] }] },
                  '$totalAmount',
                  0
                ]
              }
            }
          }
        }
      ]),
      Order.countDocuments({ restaurant: restaurantId, orderStatus: 'pending' }),
      FoodItem.countDocuments({ restaurant: restaurantId, isDeleted: { $ne: true } }),
      Order.aggregate([
        { $match: { restaurant: restaurantObjectId, orderStatus: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.foodItem',
            name: { $first: '$items.name' },
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
          }
        },
        { $sort: { quantity: -1, revenue: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, foodItemId: { $toString: '$_id' }, name: 1, quantity: 1, revenue: 1 } }
      ])
    ]);

    const aggregate = totals[0] || { totalRevenue: 0, totalOrders: 0, todayRevenue: 0, todayOrders: 0 };

    res.status(200).json({
      success: true,
      data: { ...aggregate, pendingOrders, menuItems, popularItems }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

