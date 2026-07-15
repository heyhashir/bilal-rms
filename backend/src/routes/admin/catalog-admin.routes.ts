import { Router } from 'express';
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
  saveBrand,
  saveCategory,
  updateProduct,
} from '../../controllers/admin/catalog.controller';
import { importUpload } from '../../middleware/upload';
import { barcodeSchema, brandSchema, categorySchema, productSchema } from '../../schemas/admin/catalog.schemas';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get('/products', asyncHandler(listProducts));
router.get('/categories', asyncHandler(listCategories));
router.get('/brands', asyncHandler(listBrands));
router.get('/uploads/diagnostics', asyncHandler(getUploadDiagnostics));

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

router.post(
  '/barcodes/generate',
  asyncHandler(async (req, res) => {
    req.body = barcodeSchema.parse(req.body);
    await generateBarcodes(req, res);
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
