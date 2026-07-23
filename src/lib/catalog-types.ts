export type ProductColor = { name: string; hex: string };

export type ProductVariant = {
  id: string;
  sku: string;
  size: string;
  colorName: string;
  colorHex: string;
  stock: number;
  priceOverride?: number;
  costPrice?: number | null;
  isActive: boolean;
  barcode?: string;
  qrCode?: string;
  supplierBarcode?: string;
  commissionRate?: number | null;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  categoryName: string;
  parentCategory?: string | null;
  brandId?: string | null;
  brandSlug?: string;
  brandName?: string;
  price: number;
  salePrice?: number;
  effectivePrice: number;
  costPrice?: number | null;
  images: string[];
  sizes: string[];
  colors: ProductColor[];
  stock: number;
  stockMode?: "simple" | "variant";
  sizeChart: string;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  trending?: boolean;
  featured?: boolean;
  barcode?: string;
  qrCode?: string;
  supplierBarcode?: string;
  video?: string;
  commissionRate?: number | null;
  createdAt: number;
  variants: ProductVariant[];
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  parentId?: string | null;
  isActive?: boolean;
  children: Category[];
};

export type Brand = {
  id: string;
  slug: string;
  name: string;
  country: string;
  website: string;
  status: "active" | "inactive";
  createdAt: number;
};

export type ShippingZone = {
  id: string;
  name: string;
  city: string;
  label?: string;
  isUniversal?: boolean;
  fee: number;
  freeAbove: number | null;
  isActive: boolean;
};

export type StorefrontSettings = {
  id: string;
  name: string;
  logoPrimaryText: string;
  logoSecondaryText: string;
  logoTertiaryText: string;
  promoRibbonText: string;
  promoRibbonItems: string[];
  tagline: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  currencySymbol: string;
  invoicePrefix: string;
  receiptPrefix: string;
  thermalHeader: string;
  thermalFooter: string;
  barcodePrefix: string;
  qrPrefix: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  metaTitle: string;
  metaDescription: string;
};

export type CategorySlug = string;
