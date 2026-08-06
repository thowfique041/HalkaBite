import { Router } from 'express'; import { authorize, protect } from '../middleware/auth'; import { reverseLocation, searchLocations } from '../controllers/locationController';
const router = Router(); router.use(protect, authorize('restaurant')); router.get('/search', searchLocations); router.get('/reverse', reverseLocation); export default router;
