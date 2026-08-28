import { z } from 'zod';

export const colorSchema = z.object({
  name: z.string().min(1, 'Color name is required'),
  hex: z.string().default('#000000').optional().nullable().or(z.literal('')),
  image: z.string().optional().nullable().or(z.literal('')),
});

export const variantSchema = z.object({
  id: z.string().optional().nullable().or(z.literal('')),
  sku: z.string().min(1, 'Variant SKU is required'),
  size: z.string().min(1, 'Variant size is required'),
  colorName: z.string().min(1, 'Variant color name is required'),
  colorHex: z.string().default('#000000').optional().nullable().or(z.literal('')),
  image: z.string().optional().nullable().or(z.literal('')),
  stock: z.coerce.number().int().min(0).default(0),
  priceOverride: z.coerce.number().min(0).optional().nullable().or(z.literal('')),
  isActive: z.boolean().default(true),
  barcode: z.string().optional().nullable().or(z.literal('')),
  qrCode: z.string().optional().nullable().or(z.literal('')),
  supplierBarcode: z.string().optional().nullable().or(z.literal('')),
  commissionRate: z.coerce.number().min(0).max(100).optional().nullable().or(z.literal('')),
  costPrice: z.coerce.number().min(0).optional().nullable().or(z.literal('')),
});

const sizeChartSchema = z.enum(['auto', 'apparel', 'bottoms', 'kids', 'none']);

const customSizeChartSchema = z
  .object({
    label: z.string(),
    columns: z.array(
      z.object({
        key: z.string(),
        label: z.string(),
      }),
    ),
    rows: z.array(z.record(z.string())),
  })
  .optional()
  .nullable();

export const productSchema = z.object({
  slug: z.string().min(1, 'Product slug is required'),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().default('').optional().nullable().or(z.literal('')),
  categorySlug: z.string().min(1, 'Category is required'),
  brandSlug: z.string().optional().nullable().or(z.literal('')),
  stockMode: z.enum(['simple', 'variant']).default('simple'),
  price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  salePrice: z.coerce.number().min(0).optional().nullable().or(z.literal('')),
  costPrice: z.coerce.number().min(0).optional().nullable().or(z.literal('')),
  stock: z.coerce.number().int().min(0).default(0),
  sizeChart: sizeChartSchema.default('auto'),
  customSizeChart: customSizeChartSchema,
  sizes: z.array(z.string()).default([]),
  colors: z.array(colorSchema).default([]),
  tags: z.array(z.string()).default([]),
  seoTitle: z.string().optional().nullable().or(z.literal('')),
  seoDescription: z.string().optional().nullable().or(z.literal('')),
  featured: z.boolean().default(false),
  trending: z.boolean().default(false),
  isActive: z.boolean().default(true),
  images: z.array(z.string()).default([]),
  variants: z.array(variantSchema).default([]),
  barcode: z.string().optional().nullable().or(z.literal('')),
  qrCode: z.string().optional().nullable().or(z.literal('')),
  supplierBarcode: z.string().optional().nullable().or(z.literal('')),
  video: z.string().optional().nullable().or(z.literal('')),
  commissionRate: z.coerce.number().min(0).max(100).optional().nullable().or(z.literal('')),
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
