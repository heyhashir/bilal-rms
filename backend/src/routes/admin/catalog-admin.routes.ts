import path from 'path';
import { Router } from 'express';
import { z } from 'zod';
import {
  archiveBrand,
  archiveProduct,
  createProduct,
  deleteCategory,
  generateBarcodes,
  getUploadDiagnostics,
  importProducts,
  listBrands,
  listCategories,
  listProducts,
  listBarcodeLabels,
  reprintBarcodes,
  saveBrand,
  saveCategory,
  updateProduct,
  restoreProduct,
  permanentlyDeleteProduct,
} from '../../controllers/admin/catalog.controller';
import { importUpload, productImageUpload, productVideoUpload } from '../../middleware/upload';
import { barcodeSchema, brandSchema, categorySchema, productSchema } from '../../schemas/admin/catalog.schemas';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();


router.get('/products', asyncHandler(listProducts));
router.get('/categories', asyncHandler(listCategories));
router.get('/brands', asyncHandler(listBrands));
router.get('/uploads/diagnostics', asyncHandler(getUploadDiagnostics));

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

router.post('/products/import', importUpload.single('file'), asyncHandler(importProducts));

router.post(
  '/products',
  asyncHandler(async (req, res) => {
    req.body = productSchema.parse(req.body);
    await createProduct(req, res);
  }),
);

router.put(
  '/products/:id',
  asyncHandler(async (req, res) => {
    req.body = productSchema.parse(req.body);
    await updateProduct(req, res);
  }),
);

router.delete('/products/:id', asyncHandler(archiveProduct));
router.post('/products/:id/restore', asyncHandler(restoreProduct));
router.delete('/products/:id/permanent', asyncHandler(permanentlyDeleteProduct));

router.post(
  '/barcodes/generate',
  asyncHandler(async (req, res) => {
    req.body = barcodeSchema.parse(req.body);
    await generateBarcodes(req, res);
  }),
);

router.post(
  '/barcodes/reprint',
  asyncHandler(async (req, res) => {
    req.body = z.object({
      productId: z.string().min(1),
      variantId: z.string().optional().nullable(),
    }).parse(req.body);
    await reprintBarcodes(req, res);
  }),
);

router.post(
  '/barcodes/labels',
  asyncHandler(async (req, res) => {
    req.body = z.object({
      productId: z.string().min(1),
      variantId: z.string().optional().nullable(),
    }).parse(req.body);
    await listBarcodeLabels(req, res);
  }),
);

router.post(
  '/categories',
  asyncHandler(async (req, res) => {
    req.body = categorySchema.parse(req.body);
    await saveCategory(req, res);
  }),
);

router.delete('/categories/:slug', asyncHandler(deleteCategory));

router.post(
  '/brands',
  asyncHandler(async (req, res) => {
    req.body = brandSchema.parse(req.body);
    await saveBrand(req, res);
  }),
);

router.delete('/brands/:slug', asyncHandler(archiveBrand));

export default router;
