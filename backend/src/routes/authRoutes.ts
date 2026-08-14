import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  updatePassword,
  uploadProfileAvatar,
  removeProfileAvatar
  ,getSessions,revokeSession,revokeOtherSessions,revokeAllSessions
} from '../controllers/authController';
import { protect } from '../middleware/auth';
import { upload } from '../controllers/uploadController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/profile/avatar', protect, upload.single('avatar'), uploadProfileAvatar);
router.delete('/profile/avatar', protect, removeProfileAvatar);
router.get('/sessions', protect, getSessions);
router.delete('/sessions/others', protect, revokeOtherSessions);
router.delete('/sessions/all', protect, revokeAllSessions);
router.delete('/sessions/:id', protect, revokeSession);
router.put('/password', protect, updatePassword);

export default router;
