import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} from '../controllers/cartController';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect); // All cart routes require auth

router.get('/', getCart);
router.post('/items', addToCart);
router.put('/items/:foodItemId', updateCartItem);
router.delete('/items/:foodItemId', removeFromCart);
router.delete('/', clearCart);

export default router;
