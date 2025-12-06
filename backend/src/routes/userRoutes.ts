import { Router } from 'express';
import {
    getAllUsers,
    getUser,
    updateUser,
    deleteUser
} from '../controllers/userController';
import { protect, authorize } from '../middleware/auth';

const router = Router();


router.use(protect);
router.use(authorize('admin'));

router.get('/', getAllUsers);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
