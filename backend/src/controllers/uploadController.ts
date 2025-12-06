import { Request, Response } from 'express';
import multer from 'multer';
import { storage } from '../config/cloudinary';

export const upload = multer({ storage });

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
