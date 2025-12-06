import { Request, Response } from 'express';
import { FoodItem, Category, Restaurant } from '../models';

// @desc    Get all food items
// @route   GET /api/food
// @access  Public
export const getAllFoodItems = async (req: Request, res: Response) => {
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

    const query: any = { isAvailable: true };

    // Filters
    if (category) query.category = category;
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
        foodItems,
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
export const getFoodItem = async (req: Request, res: Response) => {
  try {
    const foodItem = await FoodItem.findById(req.params.id)
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
      data: foodItem
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
// @access  Private/Admin
export const createFoodItem = async (req: Request, res: Response) => {
  try {
    console.log(req.body);
    const foodItem = await FoodItem.create(req.body);

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
// @access  Private/Admin
export const updateFoodItem = async (req: Request, res: Response) => {
  try {
    const foodItem = await FoodItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found'
      });
    }

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
// @access  Private/Admin
export const deleteFoodItem = async (req: Request, res: Response) => {
  try {
    const foodItem = await FoodItem.findByIdAndDelete(req.params.id);

    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found'
      });
    }

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
      isAvailable: true 
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
