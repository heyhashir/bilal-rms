import * as XLSX from 'xlsx';
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
    const isAccessories = input.categorySlug === 'accessories';
    const normalizedSizeChart = isAccessories ? 'none' : input.sizeChart;
    const normalizedSizes = isAccessories
      ? []
      : input.sizes.map((value) => value.trim()).filter(Boolean);
    const normalizedVariants =
      input.stockMode === 'variant'
        ? input.variants.map((variant) => ({
            ...variant,
            size: isAccessories ? 'Standard' : variant.size.trim(),
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
    const workbook = XLSX.readFile(workbookPath);
    const firstSheet = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], { defval: '' });

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
  async generateCodes(input: BarcodeInput) {
    const settings = await catalogRepository.findStoreSettings();
    return {
      barcode: makeCode(input.prefix || settings.barcodePrefix, input.seed),
      qrCode: makeCode(input.qrPrefix || settings.qrPrefix, input.seed),
    };
  },
  saveCategory: (input: CategoryInput) =>
    catalogRepository.upsertCategory({
      slug: input.slug,
      name: input.name,
      description: input.description,
    }),
  async deleteCategory(slug: string) {
    const productCount = await catalogRepository.countProductsByCategorySlug(slug);
    if (productCount > 0) {
      throw new ApiError(400, 'Move products out of this category first');
    }

    await catalogRepository.deleteCategoryBySlug(slug);
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
