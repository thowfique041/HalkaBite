import { Router } from 'express';
import {
    getAllUsers,
    getUser,
    updateUser,
    deleteUser,
    convertToRestaurantOwner
} from '../controllers/userController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

// All routes are protected and restricted to admin
router.use(protect);
router.use(authorize('admin'));

router.get('/', getAllUsers);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.put('/:id/make-restaurant-owner', convertToRestaurantOwner);
router.delete('/:id', deleteUser);

export default router;

