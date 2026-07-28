import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import {
  getDesktopReleaseStatus,
  uploadDesktopReleaseChunk,
} from '../../controllers/admin/desktop-release.controller';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();
const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 6 * 1024 * 1024,
    files: 1,
  },
});

const chunkSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/),
  uploadId: z.string().regex(/^[a-z0-9-]{8,80}$/i),
  chunkIndex: z.coerce.number().int().min(0),
  totalChunks: z.coerce.number().int().min(1).max(100),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

router.get(
  '/desktop-releases',
  asyncHandler(getDesktopReleaseStatus),
);

router.post(
  '/desktop-releases/chunks',
  chunkUpload.single('chunk'),
  asyncHandler(async (req, res) => {
    req.body = chunkSchema.parse(req.body);
    await uploadDesktopReleaseChunk(req, res);
  }),
);

export default router;
