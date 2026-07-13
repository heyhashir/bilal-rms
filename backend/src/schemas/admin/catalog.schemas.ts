import { z } from 'zod';

export const colorSchema = z.object({
  name: z.string().min(1),
  hex: z.string().min(4),
});

export const variantSchema = z.object({
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
});

const sizeChartSchema = z.enum(['apparel', 'kids', 'none']);

export const productSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(2),
  description: z.string().min(3),
  categorySlug: z.string().min(1),
  brandSlug: z.string().optional().or(z.literal('')),
  stockMode: z.enum(['simple', 'variant']).default('simple'),
  price: z.coerce.number().nonnegative(),
  salePrice: z.coerce.number().nonnegative().optional().nullable(),
  stock: z.coerce.number().int().nonnegative().default(0),
  sizeChart: sizeChartSchema.default('apparel'),
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
});

export const categorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(1),
  description: z.string().optional().or(z.literal('')),
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
