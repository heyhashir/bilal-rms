import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getCatalogBootstrap,
  getCatalogProduct,
  getCatalogSettings,
  listCatalogBrands,
  listCatalogCategories,
  listCatalogProducts,
  listCatalogShippingZones,
} from '../controllers/catalog.controller';

const router = Router();

router.get('/bootstrap', asyncHandler(getCatalogBootstrap));
router.get('/products', asyncHandler(listCatalogProducts));
router.get('/products/:slug', asyncHandler(getCatalogProduct));
router.get('/categories', asyncHandler(listCatalogCategories));
router.get('/brands', asyncHandler(listCatalogBrands));
router.get('/settings', asyncHandler(getCatalogSettings));
router.get('/shipping-zones', asyncHandler(listCatalogShippingZones));

export default router;
