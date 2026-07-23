import type { ListMeta } from "@/lib/api";
import type { Order, User } from "@/lib/account-types";
import type { Brand, Category, Product, ShippingZone, StorefrontSettings } from "@/lib/catalog-types";

export type { ListMeta };

export type ReturnRequest = {
  id: string;
  orderId: string;
  reason: string;
  details: string;
  status: string;
  refundAmount: number;
  note: string;
  createdAt: number;
};

export type Employee = {
  id: string;
  name: string;
  phone: string;
  commissionRate: number;
  status: "active" | "inactive";
  notes: string;
  createdAt: number;
  updatedAt: number;
};

export type PosSaleItem = {
  id: string;
  productId: string;
  variantId?: string | null;
  employeeId: string;
  employeeName: string;
  name: string;
  slug: string;
  sku: string;
  image: string;
  barcode: string;
  qrCode: string;
  size: string;
  color: string;
  qty: number;
  refundedQty: number;
  unitPrice: number;
  lineTotal: number;
  commissionRate: number | null;
  commissionAmount: number | null;
};

export type PosSale = {
  id: string;
  saleNumber: string;
  source: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  subtotal: number;
  total: number;
  paidAmount: number;
  paymentMethod: string;
  notes: string;
  syncedStatus: string;
  syncedAt: number | null;
  finalizedAt: number | null;
  deviceId: string;
  deviceName: string;
  receipt: {
    id: string;
    receiptNumber: string;
    invoiceNumber: string;
    reprintCount: number;
    lastPrintedAt: number | null;
  } | null;
  items: PosSaleItem[];
  payments: Array<{
    id: string;
    method: string;
    amount: number;
    reference: string;
    createdAt: number;
  }>;
  returns: Array<{
    id: string;
    saleItemId: string;
    qty: number;
    amount: number;
    reason: string;
    note: string;
    createdAt: number;
  }>;
  createdAt: number;
  updatedAt: number;
};

export type CommissionEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  saleId: string;
  saleNumber: string;
  saleItemId: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  qty: number;
  refundedQty: number;
  rate: number;
  amount: number;
  status: string;
  note: string;
  createdAt: number;
  updatedAt: number;
};

export type DashboardStats = {
  revenue: number;
  orders: number;
  pendingOrders: number;
  lowStock: number;
  returns: number;
  posRevenue: number;
  posSales: number;
  pendingCommission: number;
  employees: number;
  lowStockItems: Array<{
    productId: string;
    name: string;
    categoryName: string;
    stock: number;
  }>;
  revenueRows: Array<{
    source: "online" | "pos";
    number: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: number;
  }>;
  employeeCommissionRows: Array<{
    employeeId: string;
    name: string;
    commissionRate: number;
    pendingCommission: number;
  }>;
};

export type ReportSummary = {
  range: {
    from: string | null;
    to: string | null;
  };
  overview: {
    onlineOrders: number;
    onlineRevenue: number;
    posSales: number;
    posRevenue: number;
    posRefundAmount: number;
  };
  commissions: {
    earned: number;
    reversed: number;
    paid: number;
    payable: number;
  };
  profit: {
    total: number;
    byCategory: Array<{
      categorySlug: string;
      categoryName: string;
      profit: number;
    }>;
    byProduct: Array<{
      productId: string;
      productName: string;
      categoryName: string;
      profit: number;
    }>;
  };
  ledger: {
    credit: number;
    debit: number;
    net: number;
    count: number;
  };
  employees: Array<{
    employeeId: string;
    employeeName: string;
    earned: number;
    reversed: number;
    paid: number;
    payable: number;
  }>;
  products: Array<{
    productId: string;
    productName: string;
    earned: number;
    reversed: number;
    paid: number;
    payable: number;
  }>;
};

export type AdminCustomer = User & {
  orderCount: number;
  totalSpend: number;
};

export type StaffAccount = {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: "admin" | "manager" | "staff";
  isActive: boolean;
  lastLoginAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type Vendor = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

export type VendorPurchase = {
  id: string;
  vendorId: string;
  vendorName: string;
  productId: string;
  productName: string;
  variantId: string | null;
  variantSku: string;
  quantity: number;
  unitCost: number;
  purchasedAt: number;
  note: string;
  createdAt: number;
  updatedAt: number;
};

export type LedgerEntry = {
  id: string;
  type: string;
  direction: string;
  amount: number;
  reference: string;
  note: string;
  orderId: string | null;
  posSaleId: string | null;
  vendorPurchaseId: string | null;
  adminAccountId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type InventorySnapshotItem = {
  id: string;
  slug: string;
  name: string;
  category: string;
  categoryName: string;
  stockMode: string;
  stock: number;
  lowStock: boolean;
  variants: Array<{
    id: string;
    sku: string;
    size: string;
    colorName: string;
    stock: number;
    isActive: boolean;
  }>;
};

export type InventoryMovementEntry = {
  id: string;
  createdAt: number;
  productId: string;
  productName: string;
  productSlug: string;
  categoryName: string;
  variantId?: string | null;
  variantSku: string;
  delta: number;
  reason: string;
  source: string;
  reference: string;
  orderNumber: string;
  posSaleNumber: string;
  posReturnId: string;
  note: string;
};

export type SyncDiagnostics = {
  summary: {
    devices: number;
    failedDevices: number;
    pendingJobs: number;
    failedJobs: number;
    lastSyncAt: number | null;
  };
  devices: Array<{
    id: string;
    name: string;
    deviceKey: string;
    syncStatus: string;
    lastSeenAt: number | null;
    lastSyncAt: number | null;
    lastBootstrapAt: number | null;
    lastCursor: string | null;
    lastSyncError: string;
    pendingJobs: number;
    failedJobs: number;
    retryCount: number;
    notes: string;
    createdAt: number;
  }>;
  jobs: Array<{
    id: string;
    deviceId: string | null;
    deviceName: string;
    direction: string;
    entityType: string;
    entityId: string | null;
    jobKey: string;
    status: string;
    attempts: number;
    lastError: string;
    createdAt: number;
    updatedAt: number;
  }>;
};

export type AdminBootstrap = {
  dashboard: DashboardStats;
  settings: StorefrontSettings;
  categories: Category[];
  brands: Brand[];
  products: Product[];
  orders: Order[];
  customers: User[];
  returns: ReturnRequest[];
  shippingZones: ShippingZone[];
  employees: Employee[];
  posSales: PosSale[];
  commissions: CommissionEntry[];
};

export type PosSaleInput = {
  saleNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  paymentMethod: "cash" | "card" | "jazzcash" | "easypaisa" | "bank_transfer";
  paidAmount?: number | null;
  status?: "draft" | "finalized";
  notes?: string;
  deviceKey?: string;
  deviceName?: string;
  lines: Array<{
    productId: string;
    variantId?: string | null;
    employeeId?: string | null;
    qty: number;
    unitPrice?: number | null;
  }>;
};
