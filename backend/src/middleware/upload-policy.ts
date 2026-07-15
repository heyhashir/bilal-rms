import path from 'path';
import multer from 'multer';
import { env } from '../config/env';
import { ApiError } from '../types/ApiError';

const sanitizeFilename = (originalName: string) => {
  const extension = path.extname(originalName);
  const baseName = path.basename(originalName, extension).replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'file';
  return `${Date.now()}-${baseName}${extension.toLowerCase()}`;
};

export const createDiskStorage = (folder: string, baseDirectory = env.UPLOAD_DIR) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, path.join(baseDirectory, folder));
    },
    filename: (_req, file, cb) => {
      cb(null, sanitizeFilename(file.originalname));
    },
  });

export const createMimeTypeFilter = (allowedMimeTypes: string[], message: string) =>
  (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      cb(new ApiError(400, message));
      return;
    }

    cb(null, true);
  };

export const imageMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const videoMimeTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
export const importMimeTypes = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
