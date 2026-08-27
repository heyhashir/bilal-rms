import { Router } from 'express';
import {
  adjustInventory as adjustInventoryController,
  exportInventoryLedger as exportInventoryLedgerController,
  exportInventoryValuation as exportInventoryValuationController,
  getInventoryLedger as getInventoryLedgerController,
  getInventorySnapshot as getInventorySnapshotController,
  getInventoryValuation as getInventoryValuationController,
} from '../../controllers/admin/inventory.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { z } from 'zod';

const router = Router();

const inventorySchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  delta: z.coerce.number().int(),
  note: z.string().optional().or(z.literal('')),
});

router.get('/inventory/snapshot', asyncHandler(getInventorySnapshotController));
router.get('/inventory/ledger', asyncHandler(getInventoryLedgerController));
router.get('/inventory/ledger/export', asyncHandler(exportInventoryLedgerController));
router.get('/inventory/valuation', asyncHandler(getInventoryValuationController));
router.get('/inventory/valuation/export', asyncHandler(exportInventoryValuationController));

router.post(
  '/inventory/adjust',
  asyncHandler(async (req, res) => {
    req.body = inventorySchema.parse(req.body);
    await adjustInventoryController(req, res);
  }),
);

export default router;
