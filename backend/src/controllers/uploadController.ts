import { Request, Response } from 'express';
import multer from 'multer';
import { storage } from '../config/cloudinary';

export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
            return callback(new Error('Only JPEG, PNG, and WebP images are allowed'));
        }
        callback(null, true);
    }
});

export const uploadFile = (req: Request, res: Response) => {
    if (req.file) {
        res.send({
            message: 'File uploaded successfully',
            filePath: req.file.path,
        });
    } else {
        res.status(400).send({ message: 'No file uploaded' });
    }
};
