import { Router } from 'express';
import { handleVoiceCommand, handleChat, getCateringQuote } from '../services/aiService';
import { handleFoodRecommendation } from '../services/foodRecommendationService';
import { optionalProtect, protect } from '../middleware/auth';

const router = Router();

router.post('/voice', protect, handleVoiceCommand);
router.post('/recommendations', protect, handleFoodRecommendation);
router.post('/chat', optionalProtect, handleChat);
router.post('/catering-quote', getCateringQuote);

export default router;
