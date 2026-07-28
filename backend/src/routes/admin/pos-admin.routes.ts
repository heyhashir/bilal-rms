import { Router } from 'express';
import {
  createPosSale as createPosSaleController,
  downloadPosSalePdf as downloadPosSalePdfController,
  exportPosSales as exportPosSalesController,
  getPosSale as getPosSaleController,
  findPosSale as findPosSaleController,
  listPosSales as listPosSalesController,
  markPosSaleReprint as markPosSaleReprintController,
  refundPosSale as refundPosSaleController,
  voidPosSale as voidPosSaleController,
} from '../../controllers/admin/pos.controller';
import { requireAdmin } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { z } from 'zod';

const router = Router();


const posLineSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  qty: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().nonnegative().optional().nullable(),
});

const posSaleSchema = z.object({
  saleNumber: z.string().optional().or(z.literal('')),
  customerName: z.string().optional().or(z.literal('')),
  customerPhone: z.string().optional().or(z.literal('')),
  customerEmail: z.string().email().optional().or(z.literal('')),
  paymentMethod: z.enum(['cash', 'card', 'jazzcash', 'easypaisa', 'bank_transfer']),
  paidAmount: z.coerce.number().nonnegative().optional().nullable(),
  status: z.enum(['draft', 'finalized']).default('finalized'),
  notes: z.string().optional().or(z.literal('')),
  deviceKey: z.string().optional().or(z.literal('')),
  deviceName: z.string().optional().or(z.literal('')),
  lines: z.array(posLineSchema).min(1),
});

const posRefundSchema = z.object({
  reason: z.string().min(3),
  note: z.string().optional().or(z.literal('')),
  items: z
    .array(
      z.object({
        saleItemId: z.string().min(1),
        qty: z.coerce.number().int().positive(),
      }),
    )
    .min(1),
});

const posVoidSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

router.get('/pos-sales', asyncHandler(listPosSalesController));
router.get('/pos-sales/export', asyncHandler(exportPosSalesController));
router.get('/pos-sales-find', asyncHandler(findPosSaleController));
router.get('/pos-sales/:saleNumber/pdf', asyncHandler(downloadPosSalePdfController));
router.get('/pos-sales/:saleNumber', asyncHandler(getPosSaleController));

router.post(
  '/pos-sales',
  asyncHandler(async (req, res) => {
    req.body = posSaleSchema.parse(req.body);
    await createPosSaleController(req, res);
  }),
);

router.post(
  '/pos-sales/:saleNumber/refunds',
  asyncHandler(async (req, res) => {
    req.body = posRefundSchema.parse(req.body);
    await refundPosSaleController(req, res);
  }),
);

router.post('/pos-sales/:saleNumber/reprint', asyncHandler(markPosSaleReprintController));

router.post(
  '/pos-sales/:saleNumber/void',
  requireAdmin,
  asyncHandler(async (req, res) => {
    req.body = posVoidSchema.parse(req.body);
    await voidPosSaleController(req, res);
  }),
);

export default router;
