import multer from 'multer';
import { env } from '../config/env';
import { ensureRuntimeDirectories } from '../utils/files';
import {
  createDiskStorage,
  createMimeTypeFilter,
  imageMimeTypes,
  importMimeTypes,
  videoMimeTypes,
} from './upload-policy';

ensureRuntimeDirectories();

const fileLimit = env.MAX_UPLOAD_MB * 1024 * 1024;

export const productImageUpload = multer({
  storage: createDiskStorage('products'),
  limits: { fileSize: fileLimit },
  fileFilter: createMimeTypeFilter(imageMimeTypes, 'Only JPG, PNG, WEBP, or GIF images are allowed'),
});

export const paymentProofUpload = multer({
  storage: createDiskStorage('payments'),
  limits: { fileSize: fileLimit },
  fileFilter: createMimeTypeFilter(imageMimeTypes, 'Only JPG, PNG, WEBP, or GIF payment screenshots are allowed'),
});

export const productVideoUpload = multer({
  storage: createDiskStorage('videos'),
  limits: { fileSize: fileLimit * 3 },
  fileFilter: createMimeTypeFilter(videoMimeTypes, 'Only MP4, WEBM, or MOV product videos are allowed'),
});

export const importUpload = multer({
  storage: createDiskStorage('.', env.IMPORT_DIR),
  limits: { fileSize: fileLimit },
  fileFilter: createMimeTypeFilter(importMimeTypes, 'Only CSV or Excel files are allowed for imports'),
});
