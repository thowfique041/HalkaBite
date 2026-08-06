import { Router } from 'express';
import { authorize, protect } from '../middleware/auth';
import { clearNotifications, createAnnouncement, deleteNotification, getNotifications, markAllAsRead, markAsRead, streamNotifications } from '../controllers/notificationController';

const router = Router();
router.post('/announcements', protect, authorize('admin'), createAnnouncement);
router.use(protect, authorize('restaurant'));
router.get('/', getNotifications);
router.get('/stream', streamNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);
router.delete('/', clearNotifications);
export default router;
