import { Router } from 'express';
import {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  getAllOrders,
  reorder,
  getRestaurantOrders,
  streamOrderEvents
} from '../controllers/orderController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect); // All order routes require auth

router.post('/', createOrder);
router.get('/', getMyOrders);
router.get('/restaurant', authorize('restaurant'), getRestaurantOrders);
router.get('/events/stream', streamOrderEvents);
router.get('/admin/all', authorize('admin'), getAllOrders);
router.get('/:id', getOrder);
router.put('/:id/cancel', cancelOrder);
router.post('/:id/reorder', reorder);

// Admin routes
router.put('/:id/status', authorize('admin', 'restaurant'), updateOrderStatus);

export default router;
