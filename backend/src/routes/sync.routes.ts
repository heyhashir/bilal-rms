import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { bootstrapSync, pushSyncJobs, registerSyncDevice } from '../controllers/sync.controller';
import { z } from 'zod';

const router = Router();

const registerSchema = z.object({
  deviceKey: z.string().min(3),
  name: z.string().min(2),
  notes: z.string().optional().or(z.literal('')),
});

const pushSchema = z.object({
  deviceKey: z.string().min(3),
  cursor: z.string().optional(),
  jobs: z.array(
    z.object({
      jobKey: z.string().min(3),
      direction: z.enum(['push', 'pull']).default('push'),
      entityType: z.string().min(1),
      entityId: z.string().optional().or(z.literal('')),
      payload: z.unknown(),
      status: z.enum(['pending', 'synced', 'failed']).default('pending'),
      error: z.string().optional().or(z.literal('')),
    }),
  ),
});

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    req.body = registerSchema.parse(req.body);
    await registerSyncDevice(req, res);
  }),
);

router.get(
  '/bootstrap',
  asyncHandler(bootstrapSync),
);

router.post(
  '/push',
  asyncHandler(async (req, res) => {
    req.body = pushSchema.parse(req.body);
    await pushSyncJobs(req, res);
  }),
);

export default router;
