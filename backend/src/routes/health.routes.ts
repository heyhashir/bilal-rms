import { Router } from 'express';
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

export default router;
