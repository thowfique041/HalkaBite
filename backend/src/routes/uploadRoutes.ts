import { Router } from 'express';
import { upload, uploadFile } from '../controllers/uploadController';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/', protect, upload.single('image'), uploadFile);

export default router;
