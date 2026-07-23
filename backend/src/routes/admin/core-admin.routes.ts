import path from 'path';
import { Router } from 'express';
import { getBootstrap as getBootstrapController } from '../../controllers/admin/bootstrap.controller';
import { getDashboard as getDashboardController } from '../../controllers/admin/dashboard.controller';
import { productImageUpload, productVideoUpload } from '../../middleware/upload';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get('/bootstrap', asyncHandler(getBootstrapController));

router.get('/dashboard', asyncHandler(getDashboardController));

router.post(
  '/uploads/product-image',
  productImageUpload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json(ApiResponse.error('Image file is required'));
      return;
    }

    res.status(201).json(
      ApiResponse.success('Image uploaded', {
        path: `/uploads/products/${path.basename(req.file.path)}`,
      }),
    );
  }),
);

router.post(
  '/uploads/product-video',
  productVideoUpload.single('video'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json(ApiResponse.error('Video file is required'));
      return;
    }

    res.status(201).json(
      ApiResponse.success('Video uploaded', {
        path: `/uploads/videos/${path.basename(req.file.path)}`,
      }),
    );
  }),
);

export default router;
