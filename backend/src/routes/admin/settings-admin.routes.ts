import { Router } from 'express';
import {
  deleteShippingZone as deleteShippingZoneController,
  getSettings as getSettingsController,
  saveShippingZone as saveShippingZoneController,
  updateSettings as updateSettingsController,
} from '../../controllers/admin/settings.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { z } from 'zod';

const router = Router();


const shippingZoneSchema = z.object({
  name: z.string().min(2),
  city: z.string().min(2),
  fee: z.coerce.number().nonnegative(),
  freeAbove: z.coerce.number().nonnegative().optional().nullable(),
  isActive: z.boolean().default(true),
});

const settingsSchema = z.object({
  name: z.string().min(2),
  logoPrimaryText: z.string().min(1).max(40),
  logoSecondaryText: z.string().min(1).max(80),
  logoTertiaryText: z.string().min(1).max(40),
  promoRibbonText: z.string().min(3).max(1000),
  tagline: z.string().min(2),
  description: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(6),
  address: z.string().min(3),
  taxNumber: z.string().max(100).optional().or(z.literal('')),
  receiptLogoPath: z.string().max(500).optional().or(z.literal('')),
  currencySymbol: z.string().min(1),
  invoicePrefix: z.string().min(1),
  receiptPrefix: z.string().min(1),
  thermalHeader: z.string().optional().or(z.literal('')),
  thermalFooter: z.string().optional().or(z.literal('')),
  receiptThankYou: z.string().min(1).max(300).optional(),
  guaranteePolicy: z.string().max(2000).optional(),
  exchangePolicy: z.string().max(2000).optional(),
  returnPolicy: z.string().max(2000).optional(),
  saleItemPolicy: z.string().max(2000).optional(),
  receiptNotes: z.string().max(2000).optional(),
  barcodePrefix: z.string().min(1),
  qrPrefix: z.string().min(1),
  barcodeLabelTemplate: z.enum(['branded', 'compact']).default('branded'),
  instagram: z.string().optional().or(z.literal('')),
  facebook: z.string().optional().or(z.literal('')),
  tiktok: z.string().optional().or(z.literal('')),
  metaTitle: z.string().min(2),
  metaDescription: z.string().min(3),
});

router.get('/settings', asyncHandler(getSettingsController));

router.put(
  '/settings',
  asyncHandler(async (req, res) => {
    req.body = settingsSchema.parse(req.body);
    await updateSettingsController(req, res);
  }),
);

router.post(
  '/shipping-zones',
  asyncHandler(async (req, res) => {
    req.body = shippingZoneSchema.parse(req.body);
    await saveShippingZoneController(req, res);
  }),
);

router.delete('/shipping-zones/:id', asyncHandler(deleteShippingZoneController));

export default router;
