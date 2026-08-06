import { Router } from 'express';
import { getDashboardOverview, getDeliveryManagement, getDeliveryManDetails } from '../controllers/adminController';
import { authorize, protect } from '../middleware/auth';

const router = Router();

router.use(protect, authorize('admin'));
router.get('/stats', getDashboardOverview);
router.get('/delivery-men', getDeliveryManagement);
router.get('/delivery-men/:id', getDeliveryManDetails);

export default router;
