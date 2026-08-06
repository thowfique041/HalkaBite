import { Request, Response } from 'express';
import { Cart, FoodItem } from '../models';
import { AuthRequest } from '../middleware/auth';

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
export const getCart = async (req: AuthRequest, res: Response) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate({
        path: 'items.foodItem',
        select: 'name price image discount isAvailable'
      })
      .populate('restaurant', 'name deliveryFee minimumOrder');

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    // Calculate totals
    let subtotal = 0;
    const validItems = cart.items.filter((item: any) => {
      if (item.foodItem && item.foodItem.isAvailable) {
        const price = item.foodItem.discount 
          ? item.foodItem.price * (1 - item.foodItem.discount / 100)
          : item.foodItem.price;
        subtotal += price * item.quantity;
        return true;
      }
      return false;
    });

    res.status(200).json({
      success: true,
      data: {
        cart: {
          ...cart.toObject(),
          items: validItems
        },
        subtotal,
        itemCount: validItems.reduce((sum: number, item: any) => sum + item.quantity, 0)
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private
export const addToCart = async (req: AuthRequest, res: Response) => {
  try {
    const { foodItemId, quantity = 1, specialInstructions } = req.body;

    const foodItem = await FoodItem.findById(foodItemId).populate('restaurant');
    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found'
      });
    }

    if (!foodItem.isAvailable || foodItem.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Food item is not available'
      });
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = await Cart.create({
        user: req.user._id,
        items: [],
        restaurant: foodItem.restaurant
      });
    }

    // Check if item from different restaurant
    if (cart.restaurant && cart.restaurant.toString() !== foodItem.restaurant._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You can only order from one restaurant at a time. Clear cart first.',
        code: 'DIFFERENT_RESTAURANT'
      });
    }

    // Check if item already in cart
    const existingItemIndex = cart.items.findIndex(
      (item: any) => item.foodItem.toString() === foodItemId
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
      if (specialInstructions) {
        cart.items[existingItemIndex].specialInstructions = specialInstructions;
      }
    } else {
      cart.items.push({
        foodItem: foodItemId,
        quantity,
        specialInstructions
      });
    }

    cart.restaurant = foodItem.restaurant._id;
    await cart.save();

    // Populate and return
    await cart.populate({
      path: 'items.foodItem',
      select: 'name price image discount'
    });

    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: cart
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:foodItemId
// @access  Private
export const updateCartItem = async (req: AuthRequest, res: Response) => {
  try {
    const { foodItemId } = req.params;
    const { quantity, specialInstructions } = req.body;

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const itemIndex = cart.items.findIndex(
      (item: any) => item.foodItem.toString() === foodItemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not in cart'
      });
    }

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
      if (specialInstructions !== undefined) {
        cart.items[itemIndex].specialInstructions = specialInstructions;
      }
    }

    // Clear restaurant if cart is empty
    if (cart.items.length === 0) {
      cart.restaurant = undefined;
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart updated',
      data: cart
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:foodItemId
// @access  Private
export const removeFromCart = async (req: AuthRequest, res: Response) => {
  try {
    const { foodItemId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.items = cart.items.filter(
      (item: any) => item.foodItem.toString() !== foodItemId
    );

    if (cart.items.length === 0) {
      cart.restaurant = undefined;
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Item removed from cart'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
export const clearCart = async (req: AuthRequest, res: Response) => {
  try {
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: [], restaurant: null }
    );

    res.status(200).json({
      success: true,
      message: 'Cart cleared'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
