import { Router } from 'express';
import { upload, uploadFile } from '../controllers/uploadController';

const router = Router();

router.post('/', upload.single('image'), uploadFile);

export default router;
