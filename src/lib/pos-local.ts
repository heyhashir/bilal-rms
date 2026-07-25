import type { Employee, PosSaleInput } from "@/lib/admin-types";
import type { PosSale } from "@/lib/admin-types";
import type { Product, StorefrontSettings } from "@/lib/catalog-types";
import { getDesktopBridge } from "@/lib/desktop-bridge";

const DEVICE_KEY_STORAGE = "bilal_rms_pos_device_key";
const CACHE_STORAGE = "bilal_rms_pos_cache";
const QUEUE_STORAGE = "bilal_rms_pos_queue";
const REFUND_QUEUE_STORAGE = "bilal_rms_pos_refund_queue";
const SYNC_STATE_STORAGE = "bilal_rms_pos_sync_state";
const RECEIPTS_STORAGE = "bilal_rms_pos_receipts";

export type PosCache = {
  settings: StorefrontSettings;
  products: Product[];
  employees: Employee[];
  updatedAt: number;
};

export type PosSyncState = {
  deviceKey: string;
  lastCursor: string | null;
  lastBootstrapAt: number | null;
  lastSyncAttemptAt: number | null;
  lastSuccessfulSyncAt: number | null;
  lastSyncError: string;
  retryCount: number;
  failedJobs: number;
  queueSize: number;
};

export type PosRefundQueueItem = {
  jobKey: string;
  saleNumber: string;
  reason: string;
  note?: string;
  items: Array<{ saleItemId: string; qty: number }>;
};

const getQueuedJobCount = () => loadQueuedSales().length + loadQueuedRefunds().length;

const desktopBridge = () => getDesktopBridge();

const read = <T>(key: string): T | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const write = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const getPosDeviceKey = () => {
  const bridge = desktopBridge();
  if (bridge) return bridge.getDeviceKey();
  if (typeof window === "undefined") return "pos-web";
  const existing = window.localStorage.getItem(DEVICE_KEY_STORAGE);
  if (existing) return existing;
  const next = `pos-${crypto.randomUUID()}`;
  window.localStorage.setItem(DEVICE_KEY_STORAGE, next);
  return next;
};

export const loadPosCache = () => {
  const bridge = desktopBridge();
  if (bridge) return bridge.loadPosCache();
  return read<PosCache>(CACHE_STORAGE);
};

export const savePosCache = (cache: PosCache) => {
  const bridge = desktopBridge();
  if (bridge) {
    bridge.savePosCache(cache);
    return;
  }
  write(CACHE_STORAGE, cache);
};

export const loadPosSyncState = () => {
  const bridge = desktopBridge();
  if (bridge) return bridge.loadPosSyncState();
  return read<PosSyncState>(SYNC_STATE_STORAGE);
};

export const savePosSyncState = (state: PosSyncState) => {
  const bridge = desktopBridge();
  if (bridge) {
    bridge.savePosSyncState(state);
    return;
  }
  write(SYNC_STATE_STORAGE, state);
};

export const patchPosSyncState = (deviceKey: string, patch: Partial<PosSyncState>) => {
  const bridge = desktopBridge();
  if (bridge) {
    return bridge.patchPosSyncState({
      ...patch,
      deviceKey,
    });
  }

  const current =
    loadPosSyncState() ?? {
      deviceKey,
      lastCursor: null,
      lastBootstrapAt: null,
      lastSyncAttemptAt: null,
      lastSuccessfulSyncAt: null,
      lastSyncError: "",
      retryCount: 0,
      failedJobs: 0,
      queueSize: getQueuedJobCount(),
    };

  const next = {
    ...current,
    ...patch,
    deviceKey,
  };

  savePosSyncState(next);
  return next;
};

export const loadQueuedSales = () => {
  const bridge = desktopBridge();
  if (bridge) return bridge.loadQueuedSales();
  return read<PosSaleInput[]>(QUEUE_STORAGE) ?? [];
};

export const loadQueuedRefunds = () => {
  const bridge = desktopBridge();
  if (bridge) return bridge.loadQueuedRefunds();
  return read<PosRefundQueueItem[]>(REFUND_QUEUE_STORAGE) ?? [];
};

export const saveQueuedSales = (sales: PosSaleInput[]) => {
  write(QUEUE_STORAGE, sales);
};

export const queuePosSale = (sale: PosSaleInput) => {
  const bridge = desktopBridge();
  if (bridge) {
    bridge.queuePosSale(sale);
    if (sale.deviceKey) {
      patchPosSyncState(sale.deviceKey, { queueSize: getQueuedJobCount() });
    }
    return;
  }

  const current = loadQueuedSales();
  const next = [...current, sale];
  saveQueuedSales(next);
  if (sale.deviceKey) {
    patchPosSyncState(sale.deviceKey, { queueSize: getQueuedJobCount() });
  }
};

export const queuePosRefund = (refund: PosRefundQueueItem) => {
  const bridge = desktopBridge();
  if (bridge) {
    bridge.queuePosRefund(refund);
    const deviceKey = loadPosSyncState()?.deviceKey;
    if (deviceKey) {
      patchPosSyncState(deviceKey, { queueSize: getQueuedJobCount() });
    }
    return;
  }

  const current = loadQueuedRefunds();
  write(REFUND_QUEUE_STORAGE, [...current, refund]);
  const deviceKey = loadPosSyncState()?.deviceKey;
  if (deviceKey) {
    patchPosSyncState(deviceKey, { queueSize: getQueuedJobCount() });
  }
};

export const removeQueuedSale = (saleNumber: string) => {
  const bridge = desktopBridge();
  if (bridge) {
    bridge.removeQueuedSale(saleNumber);
    const remaining = bridge.loadQueuedSales();
    const deviceKey = remaining[0]?.deviceKey ?? loadPosSyncState()?.deviceKey;
    if (deviceKey) {
      patchPosSyncState(deviceKey, { queueSize: getQueuedJobCount() });
    }
    return;
  }

  const current = loadQueuedSales().filter((sale) => sale.saleNumber !== saleNumber);
  saveQueuedSales(current);
  const deviceKey = current[0]?.deviceKey ?? loadPosSyncState()?.deviceKey;
  if (deviceKey) {
    patchPosSyncState(deviceKey, { queueSize: getQueuedJobCount() });
  }
};

export const applySaleToCachedStock = (sale: PosSaleInput) => {
  const cache = loadPosCache();
  if (!cache) return;

  const nextProducts = cache.products.map((product) => {
    const affectedLines = sale.lines.filter((line) => line.productId === product.id);
    if (affectedLines.length === 0) return product;

    let nextProduct = { ...product, variants: [...product.variants] };
    for (const line of affectedLines) {
      if (line.variantId) {
        nextProduct = {
          ...nextProduct,
          variants: nextProduct.variants.map((variant) =>
            variant.id === line.variantId ? { ...variant, stock: Math.max(0, variant.stock - line.qty) } : variant,
          ),
        };
      } else {
        nextProduct = { ...nextProduct, stock: Math.max(0, nextProduct.stock - line.qty) };
      }
    }

    const totalVariantStock = nextProduct.variants.reduce((sum, variant) => sum + variant.stock, 0);
    return nextProduct.stockMode === "variant" ? { ...nextProduct, stock: totalVariantStock } : nextProduct;
  });

  savePosCache({ ...cache, products: nextProducts, updatedAt: Date.now() });
};

export const removeQueuedRefund = (jobKey: string) => {
  const bridge = desktopBridge();
  if (bridge) {
    bridge.removeQueuedRefund(jobKey);
    const deviceKey = loadPosSyncState()?.deviceKey;
    if (deviceKey) {
      patchPosSyncState(deviceKey, { queueSize: getQueuedJobCount() });
    }
    return;
  }

  const current = loadQueuedRefunds().filter((refund) => refund.jobKey !== jobKey);
  write(REFUND_QUEUE_STORAGE, current);
  const deviceKey = loadPosSyncState()?.deviceKey;
  if (deviceKey) {
    patchPosSyncState(deviceKey, { queueSize: getQueuedJobCount() });
  }
};

export const loadOfflineReceipts = () => {
  const bridge = desktopBridge();
  if (bridge) {
    return bridge.listOfflineReceipts();
  }

  return read<PosSale[]>(RECEIPTS_STORAGE) ?? [];
};

export const findOfflineReceipt = (receiptOrSaleNumber: string) => {
  const needle = receiptOrSaleNumber.trim().toLowerCase();
  if (!needle) return null;

  const bridge = desktopBridge();
  if (bridge) {
    return bridge.getOfflineReceipt(needle);
  }

  return (
    loadOfflineReceipts().find(
      (sale) =>
        sale.saleNumber.toLowerCase() === needle ||
        sale.receipt?.receiptNumber.toLowerCase() === needle ||
        sale.receipt?.invoiceNumber.toLowerCase() === needle,
    ) ?? null
  );
};

const buildOfflineReceipt = (
  sale: PosSaleInput,
  employees: Employee[],
  settings: StorefrontSettings | null,
): PosSale => {
  const saleNumber = sale.saleNumber ?? `OFF-${Date.now().toString(36).toUpperCase()}`;
  const subtotal = sale.lines.reduce((sum, line) => sum + (line.unitPrice ?? 0) * line.qty, 0);
  const now = Date.now();

  return {
    id: saleNumber,
    saleNumber,
    source: "pos",
    status: sale.status ?? "finalized",
    customerName: sale.customerName ?? "",
    customerPhone: sale.customerPhone ?? "",
    customerEmail: sale.customerEmail ?? "",
    subtotal,
    total: subtotal,
    paidAmount: sale.paidAmount ?? subtotal,
    paymentMethod: sale.paymentMethod,
    notes: sale.notes ?? "",
    syncedStatus: "pending",
    syncedAt: null,
    finalizedAt: now,
    deviceId: sale.deviceKey ?? "",
    deviceName: sale.deviceName ?? "Shop POS",
    receipt: {
      id: saleNumber,
      receiptNumber: `${settings?.receiptPrefix ?? "REC"}-${saleNumber}`,
      invoiceNumber: `${settings?.invoicePrefix ?? "BG"}-${saleNumber}`,
      reprintCount: 0,
      lastPrintedAt: now,
    },
    items: sale.lines.map((line, index) => ({
      id: `${saleNumber}-${index}`,
      productId: line.productId,
      variantId: line.variantId ?? null,
      employeeId: line.employeeId ?? "",
      employeeName: employees.find((employee) => employee.id === line.employeeId)?.name ?? "",
      name: "",
      slug: "",
      sku: "",
      image: "",
      barcode: "",
      qrCode: "",
      size: "",
      color: "",
      qty: line.qty,
      refundedQty: 0,
      unitPrice: line.unitPrice ?? 0,
      lineTotal: (line.unitPrice ?? 0) * line.qty,
      commissionRate: null,
      commissionAmount: null,
    })),
    payments: [],
    returns: [],
    createdAt: now,
    updatedAt: now,
  };
};

const saveOfflineReceipt = (receipt: PosSale) => {
  const current = loadOfflineReceipts().filter((sale) => sale.saleNumber !== receipt.saleNumber);
  const next = [receipt, ...current].slice(0, 250);
  write(RECEIPTS_STORAGE, next);
};

export const rememberReceipt = (receipt: PosSale) => {
  const bridge = desktopBridge();
  if (bridge) {
    bridge.rememberReceipt(receipt);
    return;
  }

  saveOfflineReceipt(receipt);
};

export const persistOfflineSale = (payload: {
  sale: PosSaleInput;
  employees: Employee[];
  settings: StorefrontSettings | null;
}) => {
  const bridge = desktopBridge();
  if (bridge) {
    return bridge.persistOfflineSale(payload);
  }

  queuePosSale(payload.sale);
  applySaleToCachedStock(payload.sale);
  const receipt = buildOfflineReceipt(payload.sale, payload.employees, payload.settings);
  saveOfflineReceipt(receipt);
  return receipt;
};

export const applyRefundToCachedStock = (sale: PosSale, items: PosRefundQueueItem["items"]) => {
  const cache = loadPosCache();
  if (!cache) return;

  const refundItems = items
    .map((entry) => {
      const saleItem = sale.items.find((item) => item.id === entry.saleItemId);
      return saleItem ? { saleItem, qty: entry.qty } : null;
    })
    .filter((entry): entry is { saleItem: PosSale["items"][number]; qty: number } => Boolean(entry));

  const nextProducts = cache.products.map((product) => {
    const affected = refundItems.filter((entry) => entry.saleItem.productId === product.id);
    if (affected.length === 0) return product;

    let nextProduct = { ...product, variants: [...product.variants] };
    for (const entry of affected) {
      if (entry.saleItem.variantId) {
        nextProduct = {
          ...nextProduct,
          variants: nextProduct.variants.map((variant) =>
            variant.id === entry.saleItem.variantId ? { ...variant, stock: variant.stock + entry.qty } : variant,
          ),
        };
      } else {
        nextProduct = { ...nextProduct, stock: nextProduct.stock + entry.qty };
      }
    }

    const totalVariantStock = nextProduct.variants.reduce((sum, variant) => sum + variant.stock, 0);
    return nextProduct.stockMode === "variant" ? { ...nextProduct, stock: totalVariantStock } : nextProduct;
  });

  savePosCache({ ...cache, products: nextProducts, updatedAt: Date.now() });
};

export const persistOfflineRefund = (payload: { refund: PosRefundQueueItem }) => {
  const bridge = desktopBridge();
  if (bridge) {
    return bridge.persistOfflineRefund(payload);
  }

  const receipt = findOfflineReceipt(payload.refund.saleNumber);
  if (!receipt) return null;

  const nextReceipt: PosSale = {
    ...receipt,
    status: receipt.items.every((item) => {
      const requested = payload.refund.items.find((entry) => entry.saleItemId === item.id)?.qty ?? 0;
      return item.refundedQty + requested >= item.qty;
    })
      ? "refunded"
      : receipt.status,
    returns: [
      ...receipt.returns,
      ...payload.refund.items.map((entry) => {
        const saleItem = receipt.items.find((item) => item.id === entry.saleItemId);
        return {
          id: `${payload.refund.jobKey}:${entry.saleItemId}`,
          saleItemId: entry.saleItemId,
          qty: entry.qty,
          amount: (saleItem?.unitPrice ?? 0) * entry.qty,
          reason: payload.refund.reason,
          note: payload.refund.note ?? "",
          createdAt: Date.now(),
        };
      }),
    ],
    items: receipt.items.map((item) => {
      const refundEntry = payload.refund.items.find((entry) => entry.saleItemId === item.id);
      return refundEntry ? { ...item, refundedQty: item.refundedQty + refundEntry.qty } : item;
    }),
    updatedAt: Date.now(),
  };

  queuePosRefund(payload.refund);
  saveOfflineReceipt(nextReceipt);
  applyRefundToCachedStock(nextReceipt, payload.refund.items);
  return nextReceipt;
};
