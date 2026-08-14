import { Router } from 'express';
import { getFeaturedFood, streamFeaturedFoodUpdates } from '../controllers/foodController';
import { optionalProtect } from '../middleware/auth';

const router = Router();
router.get('/featured', optionalProtect, getFeaturedFood);
router.get('/featured/events', streamFeaturedFoodUpdates);
export default router;
