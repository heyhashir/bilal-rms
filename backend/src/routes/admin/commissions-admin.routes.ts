import { Router } from 'express';
import {
  exportCommissions as exportCommissionsController,
  listCommissions as listCommissionsController,
  updateCommission as updateCommissionController,
} from '../../controllers/admin/commission.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { z } from 'zod';

const router = Router();

const commissionStatusSchema = z.object({
  status: z.enum(['earned', 'reversed', 'paid']),
  note: z.string().optional().or(z.literal('')),
});

router.get('/commissions', asyncHandler(listCommissionsController));
router.get('/commissions/export', asyncHandler(exportCommissionsController));

router.patch(
  '/commissions/:id',
  asyncHandler(async (req, res) => {
    req.body = commissionStatusSchema.parse(req.body);
    await updateCommissionController(req, res);
  }),
);

export default router;
