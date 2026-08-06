import { Router } from 'express';
import {
  getAllRestaurants,
  getRestaurant,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  toggleRestaurantStatus,
  getRestaurantOrders,
  getMyRestaurant,
  getRestaurantStats,
  updateMyRestaurantSettings
} from '../controllers/restaurantController';
import { protect, authorize } from '../middleware/auth';
import { getRestaurantAnalytics, getRestaurantEarnings } from '../controllers/restaurantFinanceController';

const router = Router();

router.get('/', getAllRestaurants);
router.get('/my-restaurant', protect, authorize('restaurant'), getMyRestaurant);
router.put('/my-restaurant/settings', protect, authorize('restaurant'), updateMyRestaurantSettings);
router.get('/owner/analytics', protect, authorize('restaurant'), getRestaurantAnalytics);
router.get('/owner/earnings', protect, authorize('restaurant'), getRestaurantEarnings);
router.get('/:id', getRestaurant);
router.get('/:id/orders', protect, authorize('admin', 'restaurant'), getRestaurantOrders);
router.get('/:id/stats', protect, authorize('admin', 'restaurant'), getRestaurantStats);

// Converted restaurant owners create their own restaurant profile.
// Admins may convert users, but cannot create restaurants directly.
router.post('/', protect, authorize('restaurant'), createRestaurant);
router.put('/:id', protect, authorize('admin', 'restaurant'), updateRestaurant);
router.delete('/:id', protect, authorize('admin'), deleteRestaurant);
router.put('/:id/toggle', protect, authorize('admin'), toggleRestaurantStatus);

export default router;

