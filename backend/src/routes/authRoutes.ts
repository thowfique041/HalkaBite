import { Router } from 'express';
import {
  register,
  login,
  googleLogin,
  googleRedirectLogin,
  logout,
  getMe,
  updateProfile,
  updatePassword,
  uploadProfileAvatar,
  removeProfileAvatar
  ,getFavorites,toggleFavorite
  ,getSessions,revokeSession,revokeOtherSessions,revokeAllSessions
} from '../controllers/authController';
import { protect } from '../middleware/auth';
import { upload } from '../controllers/uploadController';
import { authRateLimit } from '../middleware/rateLimit';

const router = Router();

router.post('/register', authRateLimit, register);
router.post('/login', authRateLimit, login);
router.post('/google', authRateLimit, googleLogin);
router.post('/google/redirect', authRateLimit, googleRedirectLogin);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.get('/favorites', protect, getFavorites);
router.post('/favorites/:foodId', protect, toggleFavorite);
router.put('/profile', protect, updateProfile);
router.post('/profile/avatar', protect, upload.single('avatar'), uploadProfileAvatar);
router.delete('/profile/avatar', protect, removeProfileAvatar);
router.get('/sessions', protect, getSessions);
router.delete('/sessions/others', protect, revokeOtherSessions);
router.delete('/sessions/all', protect, revokeAllSessions);
router.delete('/sessions/:id', protect, revokeSession);
router.put('/password', protect, updatePassword);

export default router;
