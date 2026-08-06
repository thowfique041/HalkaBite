import { Router } from 'express';
import { authorize, protect } from '../middleware/auth';
import {
  acceptOrder,
  getAvailableOrders,
  getDeliveryDashboard,
  rejectOrder,
  toggleOnlineStatus,
  updateDeliveryProfile,
  updateDeliveryStatus
} from '../controllers/deliveryController';

const router = Router();
router.use(protect, authorize('delivery'));
router.get('/dashboard', getDeliveryDashboard);
router.get('/orders/available', getAvailableOrders);
router.put('/online', toggleOnlineStatus);
router.put('/profile', updateDeliveryProfile);
router.post('/orders/:id/accept', acceptOrder);
router.post('/orders/:id/reject', rejectOrder);
router.put('/orders/:id/status', updateDeliveryStatus);

export default router;
