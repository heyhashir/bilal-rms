import { Router } from 'express';
import { paymentProofUpload } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';
import { checkoutOrder, createReturn, getOrder, trackOrder } from '../controllers/order.controller';
import { z } from 'zod';

const router = Router();

const lineSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  qty: z.coerce.number().int().positive(),
});

const checkoutSchema = z.object({
  email: z.string().email(),
  customerName: z.string().min(2),
  phone: z.string().min(6),
  address: z.string().min(3),
  address2: z.string().optional().or(z.literal('')),
  city: z.string().min(2),
  postal: z.string().min(2),
  country: z.string().default('Pakistan'),
  shippingZoneId: z.string().min(1),
  payment: z.enum(['cod', 'jazzcash', 'easypaisa']),
  walletReference: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  lines: z.array(lineSchema).min(1),
});

const returnSchema = z.object({
  reason: z.string().min(3),
  details: z.string().optional().or(z.literal('')),
});

const trackSchema = z.object({
  orderNumber: z.string().min(3),
  email: z.string().email(),
});

router.post(
  '/checkout',
  paymentProofUpload.single('paymentProof'),
  asyncHandler(async (req, res) => {
    const rawLines = typeof req.body.lines === 'string' ? JSON.parse(req.body.lines) : req.body.lines;
    req.body = checkoutSchema.parse({
      ...req.body,
      lines: rawLines,
    });
    await checkoutOrder(req, res);
  }),
);

router.get(
  '/:orderNumber',
  asyncHandler(getOrder),
);

router.post(
  '/track',
  asyncHandler(async (req, res) => {
    req.body = trackSchema.parse(req.body);
    await trackOrder(req, res);
  }),
);

router.post(
  '/:orderNumber/returns',
  asyncHandler(async (req, res) => {
    req.body = returnSchema.parse(req.body);
    await createReturn(req, res);
  }),
);

export default router;
