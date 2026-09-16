import { Request, Response } from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary';

const hasAllowedImageSignature = (buffer: Buffer) => {
    const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isWebp = buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
    return isJpeg || isPng || isWebp;
};

export const uploadImageBuffer = (file: Express.Multer.File) => {
    if (!hasAllowedImageSignature(file.buffer)) {
        return Promise.reject(new Error('Uploaded file content is not a valid JPEG, PNG, or WebP image'));
    }

    return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'halkabite/uploads',
                resource_type: 'image',
                transformation: [{ width: 500, height: 500, crop: 'limit' }]
            },
            (error, result) => {
                if (error || !result) return reject(error || new Error('Cloud upload failed'));
                resolve({ secure_url: result.secure_url, public_id: result.public_id });
            }
        );
        stream.end(file.buffer);
    });
};

export const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10, parts: 11 },
    fileFilter: (_req, file, callback) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
            return callback(new Error('Only JPEG, PNG, and WebP images are allowed'));
        }
        callback(null, true);
    }
});

export const uploadFile = async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).send({ message: 'No file uploaded' });
    try {
        const result = await uploadImageBuffer(req.file);
        return res.send({ message: 'File uploaded successfully', filePath: result.secure_url });
    } catch (error) {
        console.error('Image upload failed:', error);
        return res.status(400).send({ message: 'The image could not be uploaded' });
    }
};
