import { Router } from 'express';
import {
  getAllFoodItems,
  getFoodItem,
  createFoodItem,
  updateFoodItem,
  deleteFoodItem,
  getFoodByCategory,
  getMyMenuItems
} from '../controllers/foodController';
import { protect, authorize, optionalProtect } from '../middleware/auth';

const router = Router();

router.get('/', optionalProtect, getAllFoodItems);
router.get('/category/:slug', getFoodByCategory);
router.get('/manage/mine', protect, authorize('restaurant'), getMyMenuItems);
router.get('/:id', optionalProtect, getFoodItem);

// Restaurant owners only - can add, update, and delete their items
router.post('/', protect, authorize('restaurant'), createFoodItem);
router.put('/:id', protect, authorize('restaurant'), updateFoodItem);
router.delete('/:id', protect, authorize('admin', 'restaurant'), deleteFoodItem);

export default router;
