import { Request, Response } from 'express';
import { Review, Order, Restaurant, FoodItem } from '../models';
import { AuthRequest } from '../middleware/auth';
import { publishOrderEvent } from '../services/orderEventService';
import { createRestaurantNotification } from '../services/notificationService';

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private
export const createReview = async (req: AuthRequest, res: Response) => {
    try {
        const { orderId, restaurantId, foodItemId, rating, comment, images } = req.body;
        const userId = req.user._id;

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
        }
        if (typeof comment !== 'string' || comment.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Review comment must be at least 3 characters' });
        }

        if (!restaurantId && !foodItemId) {
            return res.status(400).json({ success: false, message: 'Select a restaurant or food item to review' });
        }

        // 1. Validate that the order exists, belongs to the user, and is delivered
        const order = await Order.findOne({ _id: orderId, user: userId });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found or does not belong to you' });
        }
        if (order.orderStatus !== 'delivered') {
            return res.status(400).json({ success: false, message: 'Can only review delivered orders' });
        }

        // 2. Validate that the order contains the restaurant or food item being reviewed
        if (restaurantId && order.restaurant.toString() !== restaurantId) {
            return res.status(400).json({ success: false, message: 'Order does not belong to this restaurant' });
        }
        if (foodItemId) {
            const hasFoodItem = order.items.some(item => item.foodItem.toString() === foodItemId);
            if (!hasFoodItem) {
                return res.status(400).json({ success: false, message: 'Order does not contain this food item' });
            }
        }

        // 3. Enforce one review per user per restaurant/foodItem
        const existingReviewQuery: any = { user: userId };
        if (restaurantId) existingReviewQuery.restaurant = restaurantId;
        if (foodItemId) existingReviewQuery.foodItem = foodItemId;

        const existingReview = await Review.findOne(existingReviewQuery);
        if (existingReview) {
            return res.status(400).json({ success: false, message: 'You have already reviewed this item/restaurant' });
        }

        const targetFood = foodItemId ? await FoodItem.findById(foodItemId).select('name image restaurant') : null;
        const orderedFood = foodItemId ? order.items.find(item => item.foodItem.toString() === foodItemId) : undefined;
        const notificationRestaurantId = restaurantId || targetFood?.restaurant?.toString();
        const previousRestaurant = notificationRestaurantId
            ? await Restaurant.findById(notificationRestaurantId).select('rating') : null;

        // 4. Create the review
        const review = await Review.create({
            user: userId,
            order: orderId,
            restaurant: restaurantId || order.restaurant,
            foodItem: foodItemId,
            foodId: foodItemId,
            foodName: targetFood?.name || orderedFood?.foodName || orderedFood?.name,
            foodImage: targetFood?.image || orderedFood?.foodImage,
            rating,
            comment: comment.trim(),
            review: comment.trim(),
            images
        });

        // 5. Update aggregate rating fields
        if (restaurantId) {
            const reviews = await Review.find({ restaurant: restaurantId });
            const totalRating = reviews.reduce((acc, curr) => acc + curr.rating, 0);
            const avgRating = totalRating / reviews.length;
            await Restaurant.findByIdAndUpdate(restaurantId, {
                rating: avgRating,
                reviewCount: reviews.length
            });
        }

        if (foodItemId) {
            const reviews = await Review.find({ foodItem: foodItemId });
            const totalRating = reviews.reduce((acc, curr) => acc + curr.rating, 0);
            const avgRating = totalRating / reviews.length;
            await FoodItem.findByIdAndUpdate(foodItemId, {
                rating: avgRating,
                reviewCount: reviews.length
            });
        }

        publishOrderEvent({
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            type: 'review_submitted',
            status: foodItemId || restaurantId,
            occurredAt: new Date().toISOString()
        });

        if (notificationRestaurantId) {
            await createRestaurantNotification({
                restaurantId: notificationRestaurantId,
                title: 'New Review',
                message: `${targetFood?.name || 'Your restaurant'} received a new ${rating}-star review from ${req.user.name}: “${comment.trim()}”`,
                type: 'new_review', orderId: order._id.toString(), reviewId: review._id.toString(),
                metadata: { customerName: req.user.name, foodName: targetFood?.name, foodItemId: foodItemId || undefined, rating }
            });
            const updatedRestaurant = await Restaurant.findById(notificationRestaurantId).select('rating');
            const oldRating = previousRestaurant?.rating || 0;
            const newRating = updatedRestaurant?.rating || oldRating;
            if (newRating > oldRating) {
                await createRestaurantNotification({
                    restaurantId: notificationRestaurantId, title: 'Congratulations!',
                    message: `Your restaurant rating increased from ${oldRating.toFixed(1)} to ${newRating.toFixed(1)}.`,
                    type: 'rating_increased', reviewId: review._id.toString(), metadata: { previousRating: oldRating, newRating }
                });
            }
        }

        res.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            data: review
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

// @desc    Get reviews for a restaurant
// @route   GET /api/reviews/restaurant/:id
// @access  Public
export const getRestaurantReviews = async (req: Request, res: Response) => {
    try {
        res.setHeader('Cache-Control', 'no-store');
        const restaurantItems = await FoodItem.find({ restaurant: req.params.id }).select('_id');
        const reviews = await Review.find({
            $or: [
                { restaurant: req.params.id },
                { foodItem: { $in: restaurantItems.map(item => item._id) } }
            ]
        })
            .populate('user', 'name avatar')
            .populate('foodItem', 'name image')
            .populate('restaurant', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: reviews
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

// @desc    Get reviews for a food item
// @route   GET /api/reviews/food/:id
// @access  Public
export const getFoodReviews = async (req: Request, res: Response) => {
    try {
        res.setHeader('Cache-Control', 'no-store');
        const reviews = await Review.find({ foodItem: req.params.id })
            .populate('user', 'name avatar')
            .populate('foodItem', 'name image')
            .populate('restaurant', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: reviews
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

// @desc    Get database-calculated review analytics for one owned food item
// @route   GET /api/reviews/restaurant/food/:id/analytics
// @access  Private/Restaurant
export const getFoodReviewAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user._id }).select('_id name');
        if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
        const food = await FoodItem.findOne({ _id: req.params.id, restaurant: restaurant._id })
            .populate('restaurant', 'name image');
        if (!food) return res.status(404).json({ success: false, message: 'Food item not found in your restaurant' });

        const rating = Number(req.query.rating);
        const filter: any = { foodItem: food._id };
        if (Number.isInteger(rating) && rating >= 1 && rating <= 5) filter.rating = rating;
        const sortOptions: Record<string, any> = {
            newest: { createdAt: -1 }, oldest: { createdAt: 1 },
            highest: { rating: -1, createdAt: -1 }, lowest: { rating: 1, createdAt: -1 }
        };
        const sort = sortOptions[String(req.query.sort)] || sortOptions.newest;
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

        const [summaryRows, reviews, filteredTotal] = await Promise.all([
            Review.aggregate([
                { $match: { foodItem: food._id } },
                { $group: { _id: '$rating', count: { $sum: 1 } } }
            ]),
            Review.find(filter).populate('user', 'name avatar').sort(sort).skip((page - 1) * limit).limit(limit),
            Review.countDocuments(filter)
        ]);
        const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        summaryRows.forEach(row => { distribution[row._id] = row.count; });
        const totalReviews = summaryRows.reduce((sum, row) => sum + row.count, 0);
        const weightedTotal = summaryRows.reduce((sum, row) => sum + row._id * row.count, 0);
        const averageRating = totalReviews ? weightedTotal / totalReviews : 0;

        res.setHeader('Cache-Control', 'no-store');
        res.json({ success: true, data: {
            food, averageRating, totalReviews, totalRatingsCount: totalReviews, distribution, reviews,
            pagination: { page, limit, total: filteredTotal, pages: Math.ceil(filteredTotal / limit) }
        } });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Failed to load food review analytics' });
    }
};

// @desc    Get every review for moderation
// @route   GET /api/reviews/admin/all
// @access  Private/Admin
export const getAllReviews = async (_req: Request, res: Response) => {
    try {
        const reviews = await Review.find()
            .populate('user', 'name avatar email')
            .populate('foodItem', 'name image')
            .populate('restaurant', 'name')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: reviews });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};
