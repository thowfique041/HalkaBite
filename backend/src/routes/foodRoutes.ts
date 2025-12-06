import { Router } from 'express';
import {
  getAllFoodItems,
  getFoodItem,
  createFoodItem,
  updateFoodItem,
  deleteFoodItem,
  getFoodByCategory
} from '../controllers/foodController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllFoodItems);
router.get('/category/:slug', getFoodByCategory);
router.get('/:id', getFoodItem);

// Admin routes
router.post('/', protect, authorize('admin', 'restaurant'), createFoodItem);
router.put('/:id', protect, authorize('admin', 'restaurant'), updateFoodItem);
router.delete('/:id', protect, authorize('admin', 'restaurant'), deleteFoodItem);

export default router;
