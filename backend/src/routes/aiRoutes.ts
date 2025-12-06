import { Router } from 'express';
import { handleVoiceCommand, handleChat, getCateringQuote } from '../services/aiService';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/voice', protect, handleVoiceCommand);
router.post('/chat', handleChat);
router.post('/catering-quote', getCateringQuote);

export default router;
