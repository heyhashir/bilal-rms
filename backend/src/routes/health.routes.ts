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
    res.status(200).json(
      ApiResponse.success('Bilal RMS is ready', {
        status: 'ready',
      }),
    );
  }),
);

export default router;
