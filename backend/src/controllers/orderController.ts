import { Request, Response } from 'express';
import { Order, Cart, FoodItem, Coupon, Restaurant } from '../models';
import { AuthRequest } from '../middleware/auth';
import { sendOrderConfirmation } from '../utils/email';
import orderEventEmitter, { publishOrderEvent } from '../services/orderEventService';
import { createRestaurantNotification } from '../services/notificationService';
import { Campaign } from '../models';
import { discountedPrice, findActiveCampaign } from '../services/campaignService';

// @desc    Create order
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const {
      restaurant,
      items,
      deliveryAddress,
      paymentMethod,
      couponCode,
      specialInstructions,
      isCatering,
      cateringDetails
    } = req.body;

    const targetRestaurant = await Restaurant.findOne({ _id: restaurant, isActive: true });
    if (!targetRestaurant) return res.status(404).json({ success: false, message: 'Restaurant is unavailable' });
    if (!targetRestaurant.isOpen || targetRestaurant.acceptingOrders === false) {
      return res.status(409).json({ success: false, message: 'Restaurant is not accepting orders right now' });
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];
    const campaignApplications: Array<{ campaign: any; discountAmount: number; revenue: number }> = [];

    for (const item of items) {
      const foodItem = await FoodItem.findById(item.foodItem);
      if (!foodItem) {
        return res.status(404).json({
          success: false,
          message: `Food item ${item.foodItem} not found`
        });
      }
      if (foodItem.restaurant.toString() !== targetRestaurant._id.toString() || !foodItem.isAvailable || foodItem.isDeleted) {
        return res.status(400).json({ success: false, message: `${foodItem.name} is not available from this restaurant` });
      }

      let itemPrice = foodItem.discount
        ? foodItem.price * (1 - foodItem.discount / 100)
        : foodItem.price;
      const campaign = await findActiveCampaign(targetRestaurant._id, foodItem._id, req.user._id.toString(), itemPrice);
      if (campaign) {
        const campaignPrice = discountedPrice(itemPrice, campaign);
        campaignApplications.push({ campaign, discountAmount: (itemPrice - campaignPrice) * item.quantity, revenue: campaignPrice * item.quantity });
        itemPrice = campaignPrice;
      }

      subtotal += itemPrice * item.quantity;

      orderItems.push({
        foodItem: foodItem._id,
        foodId: foodItem._id,
        name: foodItem.name,
        foodName: foodItem.name,
        foodImage: foodItem.image,
        foodPrice: itemPrice,
        restaurantId: targetRestaurant._id,
        quantity: item.quantity,
        price: itemPrice * item.quantity,
        specialInstructions: item.specialInstructions
      });
    }

    // Apply coupon if provided
    let discount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
        validFrom: { $lte: new Date() },
        validUntil: { $gte: new Date() }
      });

      if (coupon && subtotal >= coupon.minOrderAmount) {
        if (coupon.discountType === 'percentage') {
          discount = (subtotal * coupon.discountValue) / 100;
          if (coupon.maxDiscount) {
            discount = Math.min(discount, coupon.maxDiscount);
          }
        } else {
          discount = coupon.discountValue;
        }

        // Increment usage count
        coupon.usedCount += 1;
        await coupon.save();
      }
    }

    const deliveryFee = 50; // Can be dynamic based on location
    const totalAmount = subtotal - discount + deliveryFee;

    const order = await Order.create({
      user: req.user._id,
      restaurant,
      items: orderItems,
      subtotal,
      deliveryFee,
      discount,
      totalAmount,
      deliveryAddress,
      paymentMethod,
      couponCode: couponCode?.toUpperCase(),
      specialInstructions,
      isCatering,
      cateringDetails,
      estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000) // 45 mins
    });
    for (const application of campaignApplications) await Campaign.findByIdAndUpdate(application.campaign._id, { $inc: { 'metrics.redemptions': 1, 'metrics.revenueGenerated': application.revenue }, $push: { usageHistory: { customer: req.user._id, order: order._id, discountAmount: application.discountAmount, revenue: application.revenue, usedAt: new Date() } } });

    await createRestaurantNotification({
      restaurantId: order.restaurant.toString(),
      title: 'New Order Received',
      message: `${req.user.name} placed order #${order.orderNumber} for ৳${totalAmount.toFixed(0)}.`,
      type: 'new_order',
      orderId: order._id.toString(),
      metadata: { customerName: req.user.name, orderNumber: order.orderNumber, totalAmount }
    });

    // Clear cart after order
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: [], restaurant: null }
    );

    // Send confirmation email
    sendOrderConfirmation(
      req.user.email,
      order.orderNumber,
      orderItems,
      totalAmount
    ).catch(console.error);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: order
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Get user orders
// @route   GET /api/orders
// @access  Private
export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query: any = { user: req.user._id };
    if (status) query.orderStatus = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('restaurant', 'name image')
        .populate('deliveryPerson', 'name phone avatar')
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

// @desc    Get restaurant orders
// @route   GET /api/orders/restaurant
// @access  Private/Restaurant
export const getRestaurantOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    // Find the restaurant owned by the logged-in user
    const restaurant = await import('../models').then(m => m.Restaurant.findOne({ owner: req.user._id }));

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'No restaurant found for this user'
      });
    }

    const query: any = { restaurant: restaurant._id };
    if (status) query.orderStatus = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('user', 'name email phone')
        .populate('deliveryPerson', 'name phone avatar')
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

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
export const getOrder = async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('restaurant', 'name address phone image')
      .populate('deliveryPerson', 'name phone avatar')
      .populate('items.foodItem', 'image');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    let restaurantOwnsOrder = false;
    if (req.user.role === 'restaurant') {
      const owned = await Restaurant.findOne({ owner: req.user._id }).select('_id');
      restaurantOwnsOrder = Boolean(owned && order.restaurant && (order.restaurant as any)._id.toString() === owned._id.toString());
    }
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin' && !restaurantOwnsOrder) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { orderStatus, paymentStatus } = req.body;
    const allowedStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!allowedStatuses.includes(orderStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid order status' });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (req.user.role === 'restaurant') {
      const restaurant = await Restaurant.findOne({ owner: req.user._id });
      if (!restaurant || order.restaurant.toString() !== restaurant._id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only update orders for your restaurant' });
      }
      const transitions: Record<string, string[]> = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['preparing', 'cancelled'],
        preparing: ['ready'],
        ready: []
      };
      if (!transitions[order.orderStatus]?.includes(orderStatus)) {
        return res.status(400).json({ success: false, message: `Cannot change ${order.orderStatus} order to ${orderStatus}` });
      }
    }

    const previousPaymentStatus = order.paymentStatus;
    order.orderStatus = orderStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    // Publishing an order clears stale/null assignments so every eligible
    // online courier can discover it through the delivery queue.
    if (orderStatus === 'ready') {
      order.set('deliveryPerson', undefined);
      order.set('deliveryStatus', undefined);
      order.rejectedBy = [];
    }
    if (orderStatus === 'delivered') order.actualDeliveryTime = new Date();
    await order.save();
    if (paymentStatus === 'paid' && previousPaymentStatus !== 'paid') {
      await createRestaurantNotification({
        restaurantId: order.restaurant.toString(), title: 'Payment Received',
        message: `Payment of ৳${order.totalAmount.toFixed(0)} was received for order #${order.orderNumber}.`,
        type: 'payment_received', orderId: order._id.toString(),
        metadata: { orderNumber: order.orderNumber, amount: order.totalAmount }
      });
    }
    if (orderStatus === 'ready') {
      publishOrderEvent({
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        type: 'order_ready',
        status: 'ready',
        occurredAt: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated',
      data: order
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
export const cancelOrder = async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check ownership (User who placed order OR Restaurant Owner)
    if (order.user.toString() !== req.user._id.toString()) {
      // Check if user is the owner of the restaurant for this order
      const restaurant = await import('../models').then(m => m.Restaurant.findById(order.restaurant));

      if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized'
        });
      }
    }

    // Can only cancel pending or confirmed orders
    if (!['pending', 'confirmed'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order at this stage'
      });
    }

    order.orderStatus = 'cancelled';
    await order.save();
    await createRestaurantNotification({
      restaurantId: order.restaurant.toString(), title: 'Order Cancelled',
      message: `Order #${order.orderNumber} has been cancelled.`, type: 'order_cancelled',
      orderId: order._id.toString(), metadata: { orderNumber: order.orderNumber }
    });

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders/admin/all
// @access  Private/Admin
export const getAllOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { status, restaurant, page = 1, limit = 20 } = req.query;

    const query: any = {};
    if (status) query.orderStatus = status;
    if (restaurant) query.restaurant = restaurant;

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('user', 'name email phone')
        .populate('restaurant', 'name')
        .populate('deliveryPerson', 'name phone avatar')
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

export const streamOrderEvents = async (req: AuthRequest, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`event: connected\ndata: ${JSON.stringify({ connected: true })}\n\n`);

  const sendEvent = (event: unknown) => {
    res.write(`event: order-lifecycle\ndata: ${JSON.stringify(event)}\n\n`);
  };
  orderEventEmitter.on('order-lifecycle', sendEvent);
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    orderEventEmitter.off('order-lifecycle', sendEvent);
  });
};

// @desc    Reorder previous order
// @route   POST /api/orders/:id/reorder
// @access  Private
export const reorder = async (req: AuthRequest, res: Response) => {
  try {
    const originalOrder = await Order.findById(req.params.id);

    if (!originalOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (originalOrder.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Add items to cart
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      {
        items: originalOrder.items.map(item => ({
          foodItem: item.foodItem,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions
        })),
        restaurant: originalOrder.restaurant
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Items added to cart'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
