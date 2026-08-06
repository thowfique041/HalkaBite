import { Router } from 'express';
import { createReview, getRestaurantReviews, getFoodReviews, getAllReviews, getFoodReviewAnalytics } from '../controllers/reviewController';
import { authorize, protect } from '../middleware/auth';

const router = Router();

router.post('/', protect, createReview);
router.get('/admin/all', protect, authorize('admin'), getAllReviews);
router.get('/restaurant/food/:id/analytics', protect, authorize('restaurant'), getFoodReviewAnalytics);
router.get('/restaurant/:id', getRestaurantReviews);
router.get('/food/:id', getFoodReviews);

export default router;
