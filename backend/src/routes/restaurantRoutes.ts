import { Router } from 'express';
import {
  getAllRestaurants,
  getRestaurant,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  toggleRestaurantStatus
} from '../controllers/restaurantController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllRestaurants);
router.get('/:id', getRestaurant);


router.post('/', protect, authorize('admin'), createRestaurant);
router.put('/:id', protect, authorize('admin', 'restaurant'), updateRestaurant);
router.delete('/:id', protect, authorize('admin'), deleteRestaurant);
router.put('/:id/toggle', protect, authorize('admin', 'restaurant'), toggleRestaurantStatus);

export default router;
