import { Request, Response } from 'express';
import { FoodItem, Category, Restaurant } from '../models';
import { AuthRequest } from '../middleware/auth';
import { Campaign } from '../models';
import { discountedPrice, isEligible } from '../services/campaignService';

const attachCampaigns = async (foods: any[], userId?: string) => {
  const now = new Date(); const restaurantIds = [...new Set(foods.map(food => food.restaurant?._id?.toString?.() || food.restaurant?.toString?.()))];
  const campaigns = await Campaign.find({ restaurant: { $in: restaurantIds }, status: { $ne: 'cancelled' }, startAt: { $lte: now }, endAt: { $gt: now } }).lean();
  const viewed = new Set<string>();
  const result = foods.map(food => { const raw = food.toObject ? food.toObject() : food; const campaign = campaigns.filter(item => item.foodItems.some(id => id.toString() === raw._id.toString()) && isEligible(item, userId)).sort((a,b) => discountedPrice(raw.price,a)-discountedPrice(raw.price,b))[0]; if(!campaign)return raw; viewed.add(campaign._id.toString()); const price=discountedPrice(raw.price,campaign); return {...raw,promotion:{campaignId:campaign._id,label:campaign.promotionLabel,description:campaign.description,discountType:campaign.discountType,discountValue:campaign.discountValue,startAt:campaign.startAt,endAt:campaign.endAt,originalPrice:raw.price,discountedPrice:price,amountSaved:raw.price-price,percentageSaved:(raw.price-price)/raw.price*100}}; });
  if(viewed.size) Campaign.updateMany({_id:{$in:[...viewed]}},{$inc:{'metrics.views':1}}).catch(()=>undefined);
  return result;
};

// @desc    Get every menu item owned by the logged-in restaurant, including unavailable items
// @route   GET /api/food/manage/mine
// @access  Private/Restaurant
export const getMyMenuItems = async (req: AuthRequest, res: Response) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id }).select('_id');
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'No restaurant found for your account' });
    }

    const foodItems = await FoodItem.find({ restaurant: restaurant._id, isDeleted: { $ne: true } })
      .populate('category', 'name slug')
      .populate('restaurant', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        foodItems,
        pagination: { page: 1, limit: foodItems.length, total: foodItems.length, pages: foodItems.length ? 1 : 0 }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Get all food items
// @route   GET /api/food
// @access  Public
export const getAllFoodItems = async (req: AuthRequest, res: Response) => {
  try {
    const {
      category,
      restaurant,
      search,
      minPrice,
      maxPrice,
      isVegetarian,
      isSpicy,
      sort,
      page = 1,
      limit = 12
    } = req.query;

    const query: any = { isAvailable: true, isDeleted: { $ne: true } };

    // Filters
    // Convert category slug to ObjectId
    if (category) {
      const categoryDoc = await Category.findOne({ slug: category as string });
      if (categoryDoc) {
        query.category = categoryDoc._id;
      } else {
        // If category specified but not found, return no items
        return res.status(200).json({
          success: true,
          data: {
            foodItems: [],
            pagination: {
              page: Number(page),
              limit: Number(limit),
              total: 0,
              pages: 0
            }
          }
        });
      }
    }
    if (restaurant) query.restaurant = restaurant;
    if (isVegetarian === 'true') query.isVegetarian = true;
    if (isSpicy === 'true') query.isSpicy = true;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Search
    if (search) {
      query.$text = { $search: search as string };
    }

    // Sort
    let sortOption: any = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    if (sort === 'price_desc') sortOption = { price: -1 };
    if (sort === 'rating') sortOption = { rating: -1 };
    if (sort === 'popular') sortOption = { reviewCount: -1 };

    const skip = (Number(page) - 1) * Number(limit);

    const [foodItems, total] = await Promise.all([
      FoodItem.find(query)
        .populate('category', 'name slug')
        .populate('restaurant', 'name deliveryTime deliveryFee')
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit)),
      FoodItem.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        foodItems: await attachCampaigns(foodItems, req.user?._id?.toString()),
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

// @desc    Get single food item
// @route   GET /api/food/:id
// @access  Public
export const getFoodItem = async (req: AuthRequest, res: Response) => {
  try {
    const foodItem = await FoodItem.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
      .populate('category', 'name slug')
      .populate('restaurant', 'name address phone deliveryTime deliveryFee');

    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found'
      });
    }

    res.status(200).json({
      success: true,
      data: (await attachCampaigns([foodItem], req.user?._id?.toString()))[0]
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Create food item
// @route   POST /api/food
// @access  Private/Restaurant Only
export const createFoodItem = async (req: any, res: Response) => {
  try {
    // Always use restaurant owner's restaurant
    const userRestaurant = await Restaurant.findOne({ owner: req.user._id });

    if (!userRestaurant) {
      return res.status(404).json({
        success: false,
        message: 'No restaurant found for your account'
      });
    }

    const foodItemData = {
      ...req.body,
      restaurant: userRestaurant._id
    };

    const foodItem = await FoodItem.create(foodItemData);

    res.status(201).json({
      success: true,
      message: 'Food item created successfully',
      data: foodItem
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Update food item
// @route   PUT /api/food/:id
// @access  Private/Restaurant Only
export const updateFoodItem = async (req: any, res: Response) => {
  try {
    // Find user's restaurant
    const userRestaurant = await Restaurant.findOne({ owner: req.user._id });

    if (!userRestaurant) {
      return res.status(404).json({
        success: false,
        message: 'No restaurant found for your account'
      });
    }

    // Check if the food item belongs to their restaurant
    const existingItem = await FoodItem.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found'
      });
    }

    if (existingItem.restaurant.toString() !== userRestaurant._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update items from your own restaurant'
      });
    }

    // Update data without restaurant field (prevent changing restaurant)
    const updateData = { ...req.body };
    delete updateData.restaurant;

    const foodItem = await FoodItem.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Food item updated successfully',
      data: foodItem
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Delete food item
// @route   DELETE /api/food/:id
// @access  Private/Admin & Restaurant
export const deleteFoodItem = async (req: any, res: Response) => {
  try {
    const foodItem = await FoodItem.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found'
      });
    }

    // If user is a restaurant owner, ensure they can only delete their own items
    if (req.user && req.user.role === 'restaurant') {
      const userRestaurant = await Restaurant.findOne({ owner: req.user._id });

      if (!userRestaurant) {
        return res.status(404).json({
          success: false,
          message: 'No restaurant found for your account'
        });
      }

      if (foodItem.restaurant.toString() !== userRestaurant._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete items from your own restaurant'
        });
      }
    }

    foodItem.isDeleted = true;
    foodItem.isAvailable = false;
    foodItem.deletedAt = new Date();
    await foodItem.save();

    res.status(200).json({
      success: true,
      message: 'Food item deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Get food items by category
// @route   GET /api/food/category/:slug
// @access  Public
export const getFoodByCategory = async (req: Request, res: Response) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const foodItems = await FoodItem.find({
      category: category._id,
      isAvailable: true,
      isDeleted: { $ne: true }
    })
      .populate('restaurant', 'name deliveryTime')
      .sort({ rating: -1 });

    res.status(200).json({
      success: true,
      data: { category, foodItems }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
