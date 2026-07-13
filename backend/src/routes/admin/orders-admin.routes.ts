import { Router } from 'express';
import {
  exportOrders as exportOrdersController,
  listOrders as listOrdersController,
  updateOrderStatus as updateOrderStatusController,
} from '../../controllers/admin/order.controller';
import { listReturns as listReturnsController, updateReturn as updateReturnController } from '../../controllers/admin/return.controller';
import { returnStatusSchema } from '../../schemas/admin/return.schemas';
import { asyncHandler } from '../../utils/asyncHandler';
import { z } from 'zod';

const router = Router();

const statusSchema = z.object({
  orderStatus: z
    .enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returned'])
    .optional(),
  paymentStatus: z
    .enum(['pending', 'proof_uploaded', 'verified', 'rejected', 'cod_due', 'refunded'])
    .optional(),
});

router.get('/orders', asyncHandler(listOrdersController));
router.get('/orders/export', asyncHandler(exportOrdersController));

router.patch(
  '/orders/:orderNumber/status',
  asyncHandler(async (req, res) => {
    req.body = statusSchema.parse(req.body);
    await updateOrderStatusController(req, res);
  }),
);

router.get('/returns', asyncHandler(listReturnsController));

router.patch(
  '/returns/:id',
  asyncHandler(async (req, res) => {
    req.body = returnStatusSchema.parse(req.body);
    await updateReturnController(req, res);
  }),
);

export default router;
