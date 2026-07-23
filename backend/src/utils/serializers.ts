import {
  AdminAccount,
  Address,
  Brand,
  CommissionEntry,
  CommissionRule,
  Category,
  Employee,
  Order,
  OrderItem,
  PaymentProof,
  PosPayment,
  PosReturn,
  PosSale,
  PosSaleItem,
  Prisma,
  Product,
  ProductImage,
  ProductVariant,
  Receipt,
  ReturnRequest,
  ShippingZone,
  StoreSetting,
  SyncJob,
  User,
  Vendor,
  VendorPurchase,
  LedgerEntry,
} from '@prisma/client';

type ProductWithRelations = Product & {
  category: Category;
  brand: Brand | null;
  images: ProductImage[];
  variants: Array<ProductVariant & { commissionRule: CommissionRule | null }>;
  commissionRule: CommissionRule | null;
};

type CategoryWithChildren = Category & {
  children?: CategoryWithChildren[];
};

type OrderWithRelations = Order & {
  items: OrderItem[];
  paymentProof: PaymentProof | null;
};

type PosSaleWithRelations = PosSale & {
  items: Array<PosSaleItem & { employee: Employee | null }>;
  payments: PosPayment[];
  returns: PosReturn[];
  receipt: Receipt | null;
};

const decimalToNumber = (value: Prisma.Decimal | null | undefined): number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  return Number(value);
};

const normalizeColors = (
  colors: Prisma.JsonValue | null,
): Array<{ name: string; hex: string }> => {
  if (!Array.isArray(colors)) {
    return [];
  }

  return colors
    .map((entry) => {
      if (typeof entry !== 'object' || entry === null) {
        return null;
      }

      const record = entry as Record<string, unknown>;
      if (typeof record.name !== 'string' || typeof record.hex !== 'string') {
        return null;
      }

      return {
        name: record.name,
        hex: record.hex,
      };
    })
    .filter((entry): entry is { name: string; hex: string } => entry !== null);
};

const normalizeStrings = (value: Prisma.JsonValue | null): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
};

const normalizeMultilineStrings = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const serializeUserRole = (role: User['role']) => {
  if (role === 'ADMIN') {
    return 'admin';
  }

  return 'customer';
};

const serializeAdminRole = (role: AdminAccount['role']) => role.toLowerCase();

export const serializeUser = (user: User & { addresses: Address[] }) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  phone: user.phone,
  role: serializeUserRole(user.role),
  addresses: user.addresses.map((address) => ({
    id: address.id,
    label: address.label,
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    postal: address.postalCode,
    country: address.country,
    isDefault: address.isDefault,
  })),
  createdAt: user.createdAt.getTime(),
});

export const serializeAuthPrincipal = (
  principal:
    | (User & { addresses: Address[] })
    | AdminAccount,
) => {
  if ('addresses' in principal) {
    return serializeUser(principal);
  }

  return {
    id: principal.id,
    email: principal.email,
    name: principal.name,
    phone: principal.phone,
    role: serializeAdminRole(principal.role),
    addresses: [],
    createdAt: principal.createdAt.getTime(),
  };
};

export const serializeAdminCustomer = (entry: {
  customer: User & { addresses: Address[] };
  orderCount: number;
  totalSpend: number;
}) => ({
  ...serializeUser(entry.customer),
  orderCount: entry.orderCount,
  totalSpend: entry.totalSpend,
});

export type SerializedCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  parentId: string | null;
  isActive: boolean;
  children: SerializedCategory[];
};

export const serializeCategory = (category: CategoryWithChildren): SerializedCategory => ({
  id: category.id,
  slug: category.slug,
  name: category.name,
  description: category.description,
  parentId: category.parentId,
  isActive: category.isActive,
  children: Array.isArray(category.children) ? category.children.map(serializeCategory) : [],
});

export const serializeBrand = (brand: Brand) => ({
  id: brand.id,
  slug: brand.slug,
  name: brand.name,
  country: brand.country ?? '',
  website: brand.website ?? '',
  status: brand.isActive ? 'active' : 'inactive',
  createdAt: brand.createdAt.getTime(),
});

export const serializeShippingZone = (zone: ShippingZone) => ({
  id: zone.id,
  name: zone.name,
  city: zone.city,
  isUniversal: zone.city === 'ALL_CITIES',
  label: zone.city === 'ALL_CITIES' ? zone.name : `${zone.name} (${zone.city})`,
  fee: decimalToNumber(zone.fee) ?? 0,
  freeAbove: decimalToNumber(zone.freeAbove) ?? null,
  isActive: zone.isActive,
});

export const serializeSettings = (settings: StoreSetting) => ({
  id: settings.id,
  name: settings.storeName,
  logoPrimaryText: settings.logoPrimaryText,
  logoSecondaryText: settings.logoSecondaryText,
  logoTertiaryText: settings.logoTertiaryText,
  promoRibbonText: settings.promoRibbonText,
  promoRibbonItems: normalizeMultilineStrings(settings.promoRibbonText),
  tagline: settings.tagline,
  description: settings.description,
  email: settings.email,
  phone: settings.phone,
  address: settings.address,
  currency: settings.currencyCode,
  currencySymbol: settings.currencySymbol,
  invoicePrefix: settings.invoicePrefix,
  receiptPrefix: settings.receiptPrefix,
  thermalHeader: settings.thermalHeader,
  thermalFooter: settings.thermalFooter,
  barcodePrefix: settings.barcodePrefix,
  qrPrefix: settings.qrPrefix,
  instagram: settings.instagram ?? '',
  facebook: settings.facebook ?? '',
  tiktok: settings.tiktok ?? '',
  metaTitle: settings.metaTitle,
  metaDescription: settings.metaDescription,
});

export const serializeProduct = (product: ProductWithRelations) => {
  const price = decimalToNumber(product.price) ?? 0;
  const salePrice = decimalToNumber(product.salePrice);
  const colors = normalizeColors(product.colorsJson);
  const sizes = normalizeStrings(product.sizesJson);
  const tags = normalizeStrings(product.tagsJson);
  const variantColors = product.variants.map((variant) => ({
    name: variant.colorName,
    hex: variant.colorHex,
  }));
  const variantSizes = product.variants.map((variant) => variant.size);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    category: product.category.slug,
    categoryName: product.category.name,
    parentCategory: product.category.parentId ? product.category.parentId : null,
    brandId: product.brandId,
    brandSlug: product.brand?.slug ?? '',
    brandName: product.brand?.name ?? '',
    price,
    salePrice,
    effectivePrice: typeof salePrice === 'number' && salePrice < price ? salePrice : price,
    costPrice: decimalToNumber(product.costPrice) ?? null,
    images: product.images.sort((a, b) => a.sortOrder - b.sortOrder).map((image) => image.path),
    sizes: Array.from(new Set([...sizes, ...variantSizes])).filter(Boolean),
    colors: Array.from(
      new Map([...colors, ...variantColors].map((color) => [`${color.name}:${color.hex}`, color])).values(),
    ),
    stock: product.stockMode === 'VARIANT'
      ? product.variants.reduce((sum, variant) => sum + variant.stock, 0)
      : product.stock,
    stockMode: product.stockMode.toLowerCase(),
    sizeChart: product.sizeChart,
    tags,
    seoTitle: product.seoTitle ?? '',
    seoDescription: product.seoDescription ?? '',
    trending: product.trending,
    featured: product.featured,
    barcode: product.barcode ?? '',
    qrCode: product.qrCode ?? '',
    supplierBarcode: product.supplierBarcode ?? '',
    video: product.videoPath ?? '',
    commissionRate: decimalToNumber(product.commissionRule?.rate) ?? null,
    createdAt: product.createdAt.getTime(),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      size: variant.size,
      colorName: variant.colorName,
      colorHex: variant.colorHex,
      stock: variant.stock,
      priceOverride: decimalToNumber(variant.priceOverride),
      costPrice: decimalToNumber(variant.costPrice) ?? null,
      isActive: variant.isActive,
      barcode: variant.barcode ?? '',
      qrCode: variant.qrCode ?? '',
      supplierBarcode: variant.supplierBarcode ?? '',
      commissionRate: decimalToNumber(variant.commissionRule?.rate) ?? null,
    })),
  };
};

export const serializeOrder = (order: OrderWithRelations) => ({
  id: order.orderNumber,
  internalId: order.id,
  token: order.publicToken,
  userId: order.userId,
  email: order.email,
  customerName: order.customerName,
  lines: order.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    name: item.name,
    image: item.imagePath,
    size: item.size ?? '',
    color: item.colorName ?? '',
    unitPrice: decimalToNumber(item.unitPrice) ?? 0,
    qty: item.qty,
  })),
  shipping: {
    address: order.addressLine1,
    address2: order.addressLine2 ?? '',
    city: order.city,
    postal: order.postalCode,
    phone: order.phone,
    country: order.country,
    zone: order.shippingZoneName,
  },
  payment: order.paymentMethod.toLowerCase(),
  paymentStatus: order.paymentStatus.toLowerCase(),
  subtotal: decimalToNumber(order.subtotal) ?? 0,
  shippingFee: decimalToNumber(order.shippingFee) ?? 0,
  total: decimalToNumber(order.total) ?? 0,
  status: order.orderStatus.toLowerCase(),
  walletReference: order.walletReference ?? '',
  paymentProof: order.paymentProof?.filePath ?? '',
  createdAt: order.createdAt.getTime(),
});

export const serializeReturnRequest = (request: ReturnRequest) => ({
  id: request.id,
  orderId: request.orderId,
  reason: request.reason,
  details: request.details,
  status: request.status.toLowerCase(),
  refundAmount: decimalToNumber(request.refundAmount) ?? 0,
  note: request.note,
  createdAt: request.createdAt.getTime(),
});

export const serializeEmployee = (employee: Employee) => ({
  id: employee.id,
  name: employee.name,
  phone: employee.phone ?? '',
  commissionRate: decimalToNumber(employee.commissionRate) ?? 0,
  status: employee.status.toLowerCase(),
  notes: employee.notes,
  createdAt: employee.createdAt.getTime(),
  updatedAt: employee.updatedAt.getTime(),
});

export const serializePosSale = (sale: PosSaleWithRelations) => ({
  id: sale.id,
  saleNumber: sale.saleNumber,
  source: sale.source.toLowerCase(),
  status: sale.status.toLowerCase(),
  customerName: sale.customerName ?? '',
  customerPhone: sale.customerPhone ?? '',
  customerEmail: sale.customerEmail ?? '',
  subtotal: decimalToNumber(sale.subtotal) ?? 0,
  total: decimalToNumber(sale.total) ?? 0,
  paidAmount: decimalToNumber(sale.paidAmount) ?? 0,
  paymentMethod: sale.paymentMethod?.toLowerCase() ?? '',
  notes: sale.notes ?? '',
  syncedStatus: sale.syncedStatus.toLowerCase(),
  syncedAt: sale.syncedAt?.getTime() ?? null,
  finalizedAt: sale.finalizedAt?.getTime() ?? null,
  deviceId: sale.deviceId ?? '',
  deviceName: sale.deviceName ?? '',
  receipt: sale.receipt
    ? {
        id: sale.receipt.id,
        receiptNumber: sale.receipt.receiptNumber,
        invoiceNumber: sale.receipt.invoiceNumber,
        reprintCount: sale.receipt.reprintCount,
        lastPrintedAt: sale.receipt.lastPrintedAt?.getTime() ?? null,
      }
    : null,
  items: sale.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    employeeId: item.employeeId ?? '',
    employeeName: item.employee?.name ?? '',
    name: item.name,
    slug: item.slug,
    sku: item.sku ?? '',
    image: item.imagePath,
    barcode: item.barcode ?? '',
    qrCode: item.qrCode ?? '',
    size: item.size ?? '',
    color: item.colorName ?? '',
    qty: item.qty,
    refundedQty: item.refundedQty,
    unitPrice: decimalToNumber(item.unitPrice) ?? 0,
    lineTotal: decimalToNumber(item.lineTotal) ?? 0,
    commissionRate: decimalToNumber(item.commissionRate) ?? null,
    commissionAmount: decimalToNumber(item.commissionAmount) ?? null,
  })),
  payments: sale.payments.map((payment) => ({
    id: payment.id,
    method: payment.method.toLowerCase(),
    amount: decimalToNumber(payment.amount) ?? 0,
    reference: payment.reference ?? '',
    createdAt: payment.createdAt.getTime(),
  })),
  returns: sale.returns.map((entry) => ({
    id: entry.id,
    saleItemId: entry.saleItemId ?? '',
    qty: entry.qty,
    amount: decimalToNumber(entry.amount) ?? 0,
    reason: entry.reason,
    note: entry.note,
    createdAt: entry.createdAt.getTime(),
  })),
  createdAt: sale.createdAt.getTime(),
  updatedAt: sale.updatedAt.getTime(),
});

export const serializeCommissionEntry = (entry: CommissionEntry & { employee: Employee; sale: PosSale; saleItem: PosSaleItem }) => ({
  id: entry.id,
  employeeId: entry.employeeId,
  employeeName: entry.employee.name,
  saleId: entry.saleId,
  saleNumber: entry.sale.saleNumber,
  saleItemId: entry.saleItemId,
  productId: entry.productId,
  variantId: entry.variantId,
  productName: entry.saleItem.name,
  qty: entry.saleItem.qty,
  refundedQty: entry.saleItem.refundedQty,
  rate: decimalToNumber(entry.rate) ?? 0,
  amount: decimalToNumber(entry.amount) ?? 0,
  status: entry.status.toLowerCase(),
  note: entry.note,
  createdAt: entry.createdAt.getTime(),
  updatedAt: entry.updatedAt.getTime(),
});

export const serializeSyncJob = (job: SyncJob) => ({
  id: job.id,
  deviceId: job.deviceId ?? '',
  direction: job.direction.toLowerCase(),
  entityType: job.entityType,
  entityId: job.entityId ?? '',
  payload: job.payload,
  status: job.status.toLowerCase(),
  attempts: job.attempts,
  lastError: job.lastError ?? '',
  createdAt: job.createdAt.getTime(),
  updatedAt: job.updatedAt.getTime(),
});

export const serializeAdminAccountSummary = (account: AdminAccount) => ({
  id: account.id,
  email: account.email,
  name: account.name,
  phone: account.phone ?? '',
  role: account.role.toLowerCase(),
  isActive: account.isActive,
  lastLoginAt: account.lastLoginAt?.getTime() ?? null,
  createdAt: account.createdAt.getTime(),
  updatedAt: account.updatedAt.getTime(),
});

export const serializeVendor = (vendor: Vendor) => ({
  id: vendor.id,
  name: vendor.name,
  phone: vendor.phone ?? '',
  email: vendor.email ?? '',
  address: vendor.address ?? '',
  notes: vendor.notes,
  isActive: vendor.isActive,
  createdAt: vendor.createdAt.getTime(),
  updatedAt: vendor.updatedAt.getTime(),
});

export const serializeVendorPurchase = (
  purchase: VendorPurchase & {
    vendor: Vendor;
    product: Product;
    variant: ProductVariant | null;
  },
) => ({
  id: purchase.id,
  vendorId: purchase.vendorId,
  vendorName: purchase.vendor.name,
  productId: purchase.productId,
  productName: purchase.product.name,
  variantId: purchase.variantId,
  variantSku: purchase.variant?.sku ?? '',
  quantity: purchase.quantity,
  unitCost: Number(purchase.unitCost),
  purchasedAt: purchase.purchasedAt.getTime(),
  note: purchase.note,
  createdAt: purchase.createdAt.getTime(),
  updatedAt: purchase.updatedAt.getTime(),
});

export const serializeLedgerEntry = (entry: LedgerEntry) => ({
  id: entry.id,
  type: entry.type.toLowerCase(),
  direction: entry.direction.toLowerCase(),
  amount: Number(entry.amount),
  reference: entry.reference ?? '',
  note: entry.note,
  orderId: entry.orderId,
  posSaleId: entry.posSaleId,
  vendorPurchaseId: entry.vendorPurchaseId,
  adminAccountId: entry.adminAccountId,
  createdAt: entry.createdAt.getTime(),
  updatedAt: entry.updatedAt.getTime(),
});
