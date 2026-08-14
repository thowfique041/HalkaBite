import { Router } from 'express';
import { getAvailablePaymentMethods, getOrderPayment, getRestaurantPayments, rejectPayment, submitPayment, verifyPayment } from '../controllers/paymentController';
import { authorize, protect } from '../middleware/auth';

const router = Router();
router.use(protect);
router.get('/available/:restaurantId', authorize('user'), getAvailablePaymentMethods);
router.post('/', authorize('user'), submitPayment);
router.get('/order/:orderId', authorize('user'), getOrderPayment);
router.get('/restaurant', authorize('restaurant'), getRestaurantPayments);
router.patch('/:id/verify', authorize('restaurant', 'admin'), verifyPayment);
router.patch('/:id/reject', authorize('restaurant', 'admin'), rejectPayment);
export default router;
