import { Request, Response } from 'express';
import { Order, Cart, FoodItem, Coupon } from '../models';
import { AuthRequest } from '../middleware/auth';
import { sendOrderConfirmation } from '../utils/email';


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

   
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const foodItem = await FoodItem.findById(item.foodItem);
      if (!foodItem) {
        return res.status(404).json({
          success: false,
          message: `Food item ${item.foodItem} not found`
        });
      }

      const itemPrice = foodItem.discount 
        ? foodItem.price * (1 - foodItem.discount / 100) 
        : foodItem.price;
      
      subtotal += itemPrice * item.quantity;
      
      orderItems.push({
        foodItem: foodItem._id,
        name: foodItem.name,
        quantity: item.quantity,
        price: itemPrice * item.quantity,
        specialInstructions: item.specialInstructions
      });
    }


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

       
        coupon.usedCount += 1;
        await coupon.save();
      }
    }

    const deliveryFee = 50; 
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
      estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000) 
    });

    
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: [], restaurant: null }
    );

 
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


export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query: any = { user: req.user._id };
    if (status) query.orderStatus = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('restaurant', 'name image')
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

export const getOrder = async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('restaurant', 'name address phone image')
      .populate('items.foodItem', 'image');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
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


export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { orderStatus, paymentStatus } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { 
        orderStatus,
        paymentStatus,
        ...(orderStatus === 'delivered' && { actualDeliveryTime: new Date() })
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
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


export const cancelOrder = async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

 
    if (!['pending', 'confirmed'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order at this stage'
      });
    }

    order.orderStatus = 'cancelled';
    await order.save();

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
