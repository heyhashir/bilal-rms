import fs from 'fs/promises';
import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { logAdminAudit } from '../../utils/adminAudit';
import { serializeBrand, serializeCategory, serializeProduct } from '../../utils/serializers';
import { catalogAdminService } from '../../services/catalog-admin.service';

export const listProducts = async (_req: Request, res: Response) => {
  const products = await catalogAdminService.listProducts();
  res.status(200).json(ApiResponse.success('Products loaded', { products: products.map(serializeProduct) }));
};

export const listCategories = async (_req: Request, res: Response) => {
  const categories = await catalogAdminService.listCategories();
  res.status(200).json(ApiResponse.success('Categories loaded', { categories: categories.map(serializeCategory) }));
};

export const listBrands = async (_req: Request, res: Response) => {
  const brands = await catalogAdminService.listBrands();
  res.status(200).json(ApiResponse.success('Brands loaded', { brands: brands.map(serializeBrand) }));
};

export const importProducts = async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json(ApiResponse.error('Import file is required'));
    return;
  }

  try {
    const result = await catalogAdminService.importProductsFromWorkbook(req.file.path);
    res.status(201).json(ApiResponse.success('Catalog import complete', result));
  } finally {
    await fs.rm(req.file.path, { force: true }).catch(() => undefined);
  }
};

export const getUploadDiagnostics = async (_req: Request, res: Response) => {
  const diagnostics = await catalogAdminService.getUploadDiagnostics();
  res.status(200).json(ApiResponse.success('Upload diagnostics loaded', diagnostics));
};

export const createProduct = async (req: Request, res: Response) => {
  const product = await catalogAdminService.saveProduct(req.body);
  logAdminAudit(req, {
    action: 'product.created',
    targetType: 'product',
    targetId: product.id,
    details: {
      slug: product.slug,
      stockMode: product.stockMode,
      isActive: product.isActive,
    },
  });
  res.status(201).json(ApiResponse.success('Product created', { product: serializeProduct(product) }));
};

export const updateProduct = async (req: Request, res: Response) => {
  const product = await catalogAdminService.saveProduct(req.body, req.params.id);
  logAdminAudit(req, {
    action: 'product.updated',
    targetType: 'product',
    targetId: product.id,
    details: {
      slug: product.slug,
      stockMode: product.stockMode,
      isActive: product.isActive,
    },
  });
  res.status(200).json(ApiResponse.success('Product updated', { product: serializeProduct(product) }));
};

export const archiveProduct = async (req: Request, res: Response) => {
  await catalogAdminService.archiveProduct(req.params.id);
  logAdminAudit(req, {
    action: 'product.archived',
    targetType: 'product',
    targetId: req.params.id,
  });

  res.status(200).json(ApiResponse.success('Product archived', { ok: true }));
};

export const generateBarcodes = async (req: Request, res: Response) => {
  const codes = await catalogAdminService.generateCodes(req.body);
  res.status(200).json(ApiResponse.success('Codes generated', codes));
};

export const reprintBarcodes = async (req: Request, res: Response) => {
  const label = await catalogAdminService.reprintCodes(req.body);
  res.status(200).json(ApiResponse.success('Label payload generated', { label }));
};

export const saveCategory = async (req: Request, res: Response) => {
  const category = await catalogAdminService.saveCategory(req.body);
  logAdminAudit(req, {
    action: 'category.saved',
    targetType: 'category',
    targetId: category.id,
    details: {
      slug: category.slug,
    },
  });

  res.status(201).json(ApiResponse.success('Category saved', { category: serializeCategory(category) }));
};

export const deleteCategory = async (req: Request, res: Response) => {
  await catalogAdminService.deleteCategory(req.params.slug);
  logAdminAudit(req, {
    action: 'category.deleted',
    targetType: 'category',
    targetId: req.params.slug,
  });
  res.status(200).json(ApiResponse.success('Category deleted', { ok: true }));
};

export const saveBrand = async (req: Request, res: Response) => {
  const brand = await catalogAdminService.saveBrand(req.body);
  logAdminAudit(req, {
    action: 'brand.saved',
    targetType: 'brand',
    targetId: brand.id,
    details: {
      slug: brand.slug,
      isActive: brand.isActive,
    },
  });

  res.status(201).json(ApiResponse.success('Brand saved', { brand: serializeBrand(brand) }));
};

export const archiveBrand = async (req: Request, res: Response) => {
  await catalogAdminService.archiveBrand(req.params.slug);
  logAdminAudit(req, {
    action: 'brand.archived',
    targetType: 'brand',
    targetId: req.params.slug,
  });

  res.status(200).json(ApiResponse.success('Brand archived', { ok: true }));
};
