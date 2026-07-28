import { z } from 'zod';

export const colorSchema = z.object({
  name: z.string().min(1),
  hex: z.string().min(4),
});

export const variantSchema = z.object({
  id: z.string().optional().or(z.literal('')),
  sku: z.string().min(1),
  size: z.string().min(1),
  colorName: z.string().min(1),
  colorHex: z.string().min(4),
  stock: z.coerce.number().int().nonnegative(),
  priceOverride: z.coerce.number().nonnegative().optional().nullable(),
  isActive: z.boolean().default(true),
  barcode: z.string().optional().or(z.literal('')),
  qrCode: z.string().optional().or(z.literal('')),
  supplierBarcode: z.string().optional().or(z.literal('')),
  commissionRate: z.coerce.number().min(0).max(100).optional().nullable(),
  costPrice: z.coerce.number().nonnegative().optional().nullable(),
});

const sizeChartSchema = z.enum(['auto', 'apparel', 'bottoms', 'kids', 'none']);

export const productSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(2),
  description: z.string().min(3),
  categorySlug: z.string().min(1),
  brandSlug: z.string().optional().or(z.literal('')),
  stockMode: z.enum(['simple', 'variant']).default('simple'),
  price: z.coerce.number().nonnegative(),
  salePrice: z.coerce.number().nonnegative().optional().nullable(),
  costPrice: z.coerce.number().nonnegative().optional().nullable(),
  stock: z.coerce.number().int().nonnegative().default(0),
  sizeChart: sizeChartSchema.default('auto'),
  sizes: z.array(z.string()).default([]),
  colors: z.array(colorSchema).default([]),
  tags: z.array(z.string()).default([]),
  seoTitle: z.string().optional().or(z.literal('')),
  seoDescription: z.string().optional().or(z.literal('')),
  featured: z.boolean().default(false),
  trending: z.boolean().default(false),
  isActive: z.boolean().default(true),
  images: z.array(z.string()).default([]),
  variants: z.array(variantSchema).default([]),
  barcode: z.string().optional().or(z.literal('')),
  qrCode: z.string().optional().or(z.literal('')),
  supplierBarcode: z.string().optional().or(z.literal('')),
  video: z.string().optional().or(z.literal('')),
  commissionRate: z.coerce.number().min(0).max(100).optional().nullable(),
}).superRefine((product, context) => {
  if (product.stockMode !== 'variant') return;

  if (product.variants.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['variants'],
      message: 'Generate at least one size/color variant before saving',
    });
    return;
  }

  const combinations = new Set<string>();
  const skus = new Set<string>();
  const barcodes = new Set<string>();
  product.variants.forEach((variant, index) => {
    const combination = `${variant.size.trim().toLowerCase()}::${variant.colorName.trim().toLowerCase()}`;
    if (combinations.has(combination)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['variants', index],
        message: 'Duplicate size/color combination',
      });
    }
    combinations.add(combination);

    const sku = variant.sku.trim().toLowerCase();
    if (skus.has(sku)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['variants', index, 'sku'],
        message: 'Every variant must have a unique SKU',
      });
    }
    skus.add(sku);

    const barcode = variant.barcode?.trim().toLowerCase();
    if (barcode) {
      if (barcodes.has(barcode)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['variants', index, 'barcode'],
          message: 'Every variant must have a unique barcode',
        });
      }
      barcodes.add(barcode);
    }
  });
});

export const categorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(1),
  description: z.string().optional().or(z.literal('')),
  parentId: z.string().optional().nullable().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export const brandSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(1),
  country: z.string().optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const barcodeSchema = z.object({
  prefix: z.string().optional().or(z.literal('')),
  qrPrefix: z.string().optional().or(z.literal('')),
  seed: z.string().optional().or(z.literal('')),
});

export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type BrandInput = z.infer<typeof brandSchema>;
export type BarcodeInput = z.infer<typeof barcodeSchema>;
