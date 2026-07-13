import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import {
  createAddress,
  deleteAddress,
  getProfile,
  listAccountOrders,
  listAddresses,
  markDefaultAddress,
  saveAddress,
  updatePassword,
  updateProfile,
} from '../controllers/account.controller';
import { z } from 'zod';

const router = Router();

const profileSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional().or(z.literal('')),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

const addressSchema = z.object({
  label: z.string().min(1),
  fullName: z.string().min(2),
  phone: z.string().min(6),
  line1: z.string().min(3),
  line2: z.string().optional().or(z.literal('')),
  city: z.string().min(2),
  postal: z.string().min(2),
  country: z.string().default('Pakistan'),
  isDefault: z.boolean().default(false),
});

router.use(requireAuth);

router.get(
  '/profile',
  asyncHandler(getProfile),
);

router.put(
  '/profile',
  asyncHandler(async (req, res) => {
    req.body = profileSchema.parse(req.body);
    await updateProfile(req, res);
  }),
);

router.post(
  '/password',
  asyncHandler(async (req, res) => {
    req.body = passwordSchema.parse(req.body);
    try {
      await updatePassword(req, res);
    } catch (error) {
      if (error instanceof Error && error.message === 'Current password is incorrect') {
        res.status(400).json(ApiResponse.error(error.message));
        return;
      }
      throw error;
    }
  }),
);

router.get(
  '/addresses',
  asyncHandler(listAddresses),
);

router.post(
  '/addresses',
  asyncHandler(async (req, res) => {
    req.body = addressSchema.parse(req.body);
    await createAddress(req, res);
  }),
);

router.put(
  '/addresses/:id',
  asyncHandler(async (req, res) => {
    req.body = addressSchema.parse(req.body);
    await saveAddress(req, res);
  }),
);

router.delete(
  '/addresses/:id',
  asyncHandler(deleteAddress),
);

router.post(
  '/addresses/:id/default',
  asyncHandler(markDefaultAddress),
);

router.get(
  '/orders',
  asyncHandler(listAccountOrders),
);

export default router;
