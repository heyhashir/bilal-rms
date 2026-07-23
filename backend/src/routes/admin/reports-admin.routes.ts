import { Router } from 'express';
import {
  createLedgerEntry as createLedgerEntryController,
  createVendorPurchase as createVendorPurchaseController,
  listLedgerEntries as listLedgerEntriesController,
  listVendorPurchases as listVendorPurchasesController,
  listVendors as listVendorsController,
  saveVendor as saveVendorController,
  archiveVendor as archiveVendorController,
} from '../../controllers/admin/backoffice.controller';
import { getReportSummary } from '../../controllers/admin/report.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { z } from 'zod';

const router = Router();

const vendorSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

const vendorPurchaseSchema = z.object({
  vendorId: z.string().min(1),
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  quantity: z.coerce.number().int().positive(),
  unitCost: z.coerce.number().nonnegative(),
  purchasedAt: z.string().optional().or(z.literal('')),
  note: z.string().optional().or(z.literal('')),
});

const ledgerEntrySchema = z.object({
  type: z.enum(['expense', 'adjustment']),
  direction: z.enum(['credit', 'debit']),
  amount: z.coerce.number().nonnegative(),
  reference: z.string().optional().or(z.literal('')),
  note: z.string().optional().or(z.literal('')),
});

router.get('/reports/summary', asyncHandler(getReportSummary));
router.get('/vendors', asyncHandler(listVendorsController));
router.get('/vendor-purchases', asyncHandler(listVendorPurchasesController));
router.get('/ledger', asyncHandler(listLedgerEntriesController));

router.post(
  '/vendors',
  asyncHandler(async (req, res) => {
    req.body = vendorSchema.parse(req.body);
    await saveVendorController(req, res);
  }),
);

router.delete('/vendors/:id', asyncHandler(archiveVendorController));

router.post(
  '/vendor-purchases',
  asyncHandler(async (req, res) => {
    req.body = vendorPurchaseSchema.parse(req.body);
    await createVendorPurchaseController(req, res);
  }),
);

router.post(
  '/ledger',
  asyncHandler(async (req, res) => {
    req.body = ledgerEntrySchema.parse(req.body);
    await createLedgerEntryController(req, res);
  }),
);

export default router;
