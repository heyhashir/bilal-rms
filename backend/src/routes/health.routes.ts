import { Router } from 'express';
import prisma from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.status(200).json(
      ApiResponse.success('Bilal RMS Backend Running', {
        version: '1.0.0',
      }),
    );
  }),
);

router.get(
  '/live',
  asyncHandler(async (_req, res) => {
    res.status(200).json(
      ApiResponse.success('Bilal RMS process is live', {
        status: 'live',
      }),
    );
  }),
);

router.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$queryRaw`SELECT customSizeChartJson FROM products LIMIT 0`;
    await prisma.$queryRaw`SELECT image, costPrice FROM product_variants LIMIT 0`;
    await prisma.$queryRaw`SELECT vendorPurchaseId FROM inventory_movements LIMIT 0`;
    await prisma.$queryRaw`SELECT loginAccountId FROM employees LIMIT 0`;
    await prisma.$queryRaw`SELECT cashierAccountId FROM pos_sales LIMIT 0`;
    await prisma.$queryRaw`SELECT lookupCode FROM receipts LIMIT 0`;
    await prisma.$queryRaw`SELECT vendorId FROM ledger_entries LIMIT 0`;
    await prisma.$queryRaw`SELECT cancelledAmount FROM commission_entries LIMIT 0`;
    await prisma.$queryRaw`SELECT id FROM pos_exchanges LIMIT 0`;
    res.status(200).json(
      ApiResponse.success('Bilal RMS is ready', {
        status: 'ready',
      }),
    );
  }),
);

export default router;
