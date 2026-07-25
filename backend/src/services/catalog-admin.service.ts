import fs from 'node:fs/promises';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { catalogRepository } from '../repositories/catalog.repository';
import { BarcodeInput, BrandInput, CategoryInput, ProductInput, productSchema } from '../schemas/admin/catalog.schemas';
import { ApiError } from '../types/ApiError';
import { collectMissingManagedFiles, deleteUploadIfManaged } from '../utils/file-maintenance';

export const catalogAdminService = {
  listProducts: () => catalogRepository.listProducts(),
  listCategories: () => catalogRepository.listCategories(),
  listBrands: () => catalogRepository.listBrands(),
  async saveProduct(input: ProductInput, productId?: string) {
    const existingProduct = productId ? await catalogRepository.findProductById(productId) : null;
    const category = await catalogRepository.findCategoryBySlug(input.categorySlug);
    const brand = input.brandSlug ? await catalogRepository.findBrandBySlug(input.brandSlug) : null;
    const normalizedSizeChart = input.sizeChart === 'auto' ? inferSizeChart(input.categorySlug) : input.sizeChart;
    const hasSizeChart = normalizedSizeChart !== 'none';
    const normalizedSizes = !hasSizeChart
      ? []
      : input.sizes.map((value) => value.trim()).filter(Boolean);
    const normalizedVariants =
      input.stockMode === 'variant'
        ? input.variants.map((variant) => ({
            ...variant,
            size: hasSizeChart ? variant.size.trim() : 'Standard',
            colorName: variant.colorName.trim(),
          }))
        : [];

    const data: Prisma.ProductUncheckedCreateInput = {
      slug: input.slug,
      name: input.name,
      description: input.description,
      categoryId: category.id,
      brandId: brand?.id ?? null,
      stockMode: input.stockMode === 'variant' ? 'VARIANT' : 'SIMPLE',
      price: input.price,
      salePrice: input.salePrice ?? null,
      costPrice: input.costPrice ?? null,
      stock: input.stockMode === 'variant' ? 0 : input.stock,
      sizeChart: normalizedSizeChart,
      sizesJson: normalizedSizes,
      colorsJson: input.colors,
      tagsJson: input.tags,
      seoTitle: normalizeOptionalString(input.seoTitle),
      seoDescription: normalizeOptionalString(input.seoDescription),
      featured: input.featured,
      trending: input.trending,
      isActive: input.isActive,
      barcode: normalizeOptionalString(input.barcode),
      qrCode: normalizeOptionalString(input.qrCode),
      supplierBarcode: normalizeOptionalString(input.supplierBarcode),
      videoPath: normalizeOptionalString(input.video),
    };

    const product = await prisma.$transaction(async (tx) => {
      const savedProduct = productId
        ? await catalogRepository.updateProduct(tx, productId, data)
        : await catalogRepository.createProduct(tx, data);

      await catalogRepository.replaceProductImages(tx, savedProduct.id, input.images);
      await catalogRepository.deleteCommissionRulesForProduct(tx, savedProduct.id);

      await catalogRepository.deleteProductVariants(tx, savedProduct.id);

      if (input.stockMode === 'variant' && normalizedVariants.length > 0) {
        for (const variant of normalizedVariants) {
          const createdVariant = await catalogRepository.createProductVariant(tx, {
            productId: savedProduct.id,
            sku: variant.sku,
            size: variant.size,
            colorName: variant.colorName,
            colorHex: variant.colorHex,
            stock: variant.stock,
            priceOverride: variant.priceOverride ?? null,
            costPrice: variant.costPrice ?? null,
            isActive: variant.isActive,
            barcode: normalizeOptionalString(variant.barcode),
            qrCode: normalizeOptionalString(variant.qrCode),
            supplierBarcode: normalizeOptionalString(variant.supplierBarcode),
          });
          await catalogRepository.deleteCommissionRulesForVariant(tx, createdVariant.id);
        }
      }

      return savedProduct;
    });

    const refreshed = await catalogRepository.findProductById(product.id);

    if (existingProduct) {
      const nextImages = new Set(refreshed.images.map((image) => image.path));
      await Promise.all(
        existingProduct.images
          .map((image) => image.path)
          .filter((imagePath) => !nextImages.has(imagePath))
          .map((imagePath) => deleteUploadIfManaged(imagePath)),
      );

      if (existingProduct.videoPath && existingProduct.videoPath !== refreshed.videoPath) {
        await deleteUploadIfManaged(existingProduct.videoPath);
      }
    }

    return refreshed;
  },
  async importProductsFromWorkbook(workbookPath: string) {
    const rows = await readImportRows(workbookPath);

    const failures: Array<{ row: number; slug: string; message: string }> = [];
    let successCount = 0;

    for (const [index, row] of rows.entries()) {
      try {
        const colors = typeof row.colors === 'string' && row.colors.length > 0 ? JSON.parse(row.colors) : [];
        const variants = typeof row.variants === 'string' && row.variants.length > 0 ? JSON.parse(row.variants) : [];

        const payload = productSchema.parse({
          slug: row.slug,
          name: row.name,
          description: row.description,
          categorySlug: row.category,
          brandSlug: row.brand,
          stockMode: String(row.stockMode || 'simple').toLowerCase(),
          price: row.price,
          salePrice: row.salePrice || null,
          stock: row.stock || 0,
          sizeChart: row.sizeChart || 'apparel',
          sizes:
            typeof row.sizes === 'string'
              ? String(row.sizes)
                  .split(',')
                  .map((value) => value.trim())
                  .filter(Boolean)
              : [],
          colors,
          tags:
            typeof row.tags === 'string'
              ? String(row.tags)
                  .split(',')
                  .map((value) => value.trim())
                  .filter(Boolean)
              : [],
          images:
            typeof row.images === 'string'
              ? String(row.images)
                  .split(',')
                  .map((value) => value.trim())
                  .filter(Boolean)
              : [],
          featured: String(row.featured).toLowerCase() === 'true',
          trending: String(row.trending).toLowerCase() === 'true',
          isActive: String(row.isActive || 'true').toLowerCase() !== 'false',
          variants,
          barcode: row.barcode,
          qrCode: row.qrCode,
          supplierBarcode: row.supplierBarcode,
          video: row.video,
          commissionRate: row.commissionRate || null,
        });

        await catalogAdminService.saveProduct(payload);
        successCount += 1;
      } catch (error) {
        failures.push({
          row: index + 2,
          slug: typeof row.slug === 'string' ? row.slug : '',
          message: error instanceof Error ? error.message : 'Unknown import error',
        });
      }
    }

    return {
      count: rows.length,
      successCount,
      failureCount: failures.length,
      failures,
    };
  },
  async getUploadDiagnostics() {
    const [productImages, paymentProofs] = await Promise.all([
      prisma.productImage.findMany({ select: { path: true } }),
      prisma.paymentProof.findMany({ select: { filePath: true } }),
    ]);

    const [missingProductImages, missingPaymentProofs] = await Promise.all([
      collectMissingManagedFiles(productImages.map((entry) => entry.path)),
      collectMissingManagedFiles(paymentProofs.map((entry) => entry.filePath)),
    ]);

    return {
      totals: {
        productImages: productImages.length,
        paymentProofs: paymentProofs.length,
      },
      missingProductImages,
      missingPaymentProofs,
    };
  },
  archiveProduct: (id: string) => catalogRepository.archiveProduct(id),
  restoreProduct: (id: string) => catalogRepository.restoreProduct(id),
  async permanentlyDeleteProduct(id: string) {
    const product = await catalogRepository.findProductById(id);
    const references = await catalogRepository.countProductReferences(id);
    const referenceCount = Object.values(references).reduce((total, count) => total + count, 0);
    if (referenceCount > 0) {
      throw new ApiError(409, 'This product has business history and can only be archived.');
    }

    const deleted = await catalogRepository.permanentlyDeleteProduct(id);
    await Promise.all([
      ...product.images.map((image) => deleteUploadIfManaged(image.path)),
      product.videoPath ? deleteUploadIfManaged(product.videoPath) : Promise.resolve(),
    ]);
    return deleted;
  },
  async generateCodes(input: BarcodeInput) {
    const settings = await catalogRepository.findStoreSettings();
    return {
      barcode: makeCode(input.prefix || settings.barcodePrefix, input.seed),
      qrCode: makeCode(input.qrPrefix || settings.qrPrefix, input.seed),
    };
  },
  async reprintCodes(input: { productId: string; variantId?: string | null }) {
    const product = await catalogRepository.findProductById(input.productId);
    const variant = input.variantId ? product.variants.find((entry) => entry.id === input.variantId) : null;
    if (input.variantId && !variant) {
      throw new ApiError(404, 'Variant not found');
    }

    const settings = await catalogRepository.findStoreSettings();
    const barcode = variant?.barcode || product.barcode || makeCode(settings.barcodePrefix, variant?.sku ?? product.slug);
    const qrCode = variant?.qrCode || product.qrCode || makeCode(settings.qrPrefix, variant?.sku ?? product.slug);

    await prisma.$transaction(async (tx) => {
      if (variant) {
        await catalogRepository.updateProductVariantCodes(tx, variant.id, {
          barcode: variant.barcode || barcode,
          qrCode: variant.qrCode || qrCode,
        });
      } else {
        await catalogRepository.updateProductCodes(tx, product.id, {
          barcode: product.barcode || barcode,
          qrCode: product.qrCode || qrCode,
        });
      }
    });

    return {
      productId: product.id,
      variantId: variant?.id ?? null,
      name: product.name,
      sku: variant?.sku ?? '',
      size: variant?.size ?? '',
      color: variant?.colorName ?? '',
      barcode,
      qrCode,
    };
  },
  saveCategory: (input: CategoryInput) =>
    catalogRepository.upsertCategory({
      slug: input.slug,
      name: input.name,
      description: input.description,
      parentId: input.parentId || null,
      isActive: input.isActive,
    }),
  async deleteCategory(slug: string) {
    const productCount = await catalogRepository.countProductsByCategorySlug(slug);
    if (productCount > 0) {
      throw new ApiError(400, 'Move products out of this category first');
    }

    await catalogRepository.archiveCategoryBySlug(slug);
  },
  saveBrand: (input: BrandInput) =>
    catalogRepository.upsertBrand({
      slug: input.slug,
      name: input.name,
      country: input.country,
      website: input.website,
      isActive: input.status === 'active',
    }),
  archiveBrand: (slug: string) => catalogRepository.archiveBrandBySlug(slug),
};

const normalizeOptionalString = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const makeCode = (prefix: string, seed?: string): string => {
  const safePrefix = prefix.replace(/[^a-z0-9]/gi, '').toUpperCase() || 'BG';
  const safeSeed = (seed ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 8);
  const suffix = `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  return [safePrefix, safeSeed, suffix].filter(Boolean).join('-');
};

const readImportRows = async (workbookPath: string): Promise<Array<Record<string, string>>> => {
  const extension = path.extname(workbookPath).toLowerCase();
  if (extension !== '.csv') {
    throw new ApiError(400, 'Only CSV product imports are currently supported. Convert Excel files to CSV before importing.');
  }

  const content = await fs.readFile(workbookPath, 'utf8');
  const records = parseCsv(content);
  const headers = records.shift()?.map((header) => header.trim()) ?? [];
  if (headers.length === 0 || headers.every((header) => !header)) {
    throw new ApiError(400, 'The first import row must contain column headers.');
  }

  return records
    .filter((record) => record.some((value) => value.trim().length > 0))
    .map((record) =>
      Object.fromEntries(
      headers
          .map((header: string, index: number) => [header, record[index]?.trim() ?? ''] as const)
        .filter(([header]: readonly [string, string]) => Boolean(header)),
      ),
    );
};

const parseCsv = (content: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const nextCharacter = content[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      if (rows.length > 5_001) {
        throw new ApiError(400, 'CSV imports are limited to 5,000 product rows.');
      }
      continue;
    }

    field += character;
  }

  if (inQuotes) {
    throw new ApiError(400, 'The CSV contains an unclosed quoted field.');
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
};

const inferSizeChart = (categorySlug: string): 'apparel' | 'bottoms' | 'kids' | 'none' => {
  const slug = categorySlug.toLowerCase();
  if (slug === 'accessories' || /accessor|watch|belt|cap|scarf|sock/.test(slug)) {
    return 'none';
  }

  if (slug === 'kids' || /kid|boy|girl|infant/.test(slug)) {
    return 'kids';
  }

  if (/jean|bottom|trouser|pant/.test(slug)) {
    return 'bottoms';
  }

  return 'apparel';
};
