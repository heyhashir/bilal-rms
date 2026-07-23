import type { Employee, PosSaleInput } from "@/lib/admin-types";
import type { Product, StorefrontSettings } from "@/lib/catalog-types";

const DEVICE_KEY_STORAGE = "bilal_rms_pos_device_key";
const CACHE_STORAGE = "bilal_rms_pos_cache";
const QUEUE_STORAGE = "bilal_rms_pos_queue";
const SYNC_STATE_STORAGE = "bilal_rms_pos_sync_state";

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
  if (typeof window === "undefined") return "pos-web";
  const existing = window.localStorage.getItem(DEVICE_KEY_STORAGE);
  if (existing) return existing;
  const next = `pos-${crypto.randomUUID()}`;
  window.localStorage.setItem(DEVICE_KEY_STORAGE, next);
  return next;
};

export const loadPosCache = () => read<PosCache>(CACHE_STORAGE);

export const savePosCache = (cache: PosCache) => write(CACHE_STORAGE, cache);

export const loadPosSyncState = () => read<PosSyncState>(SYNC_STATE_STORAGE);

export const savePosSyncState = (state: PosSyncState) => write(SYNC_STATE_STORAGE, state);

export const patchPosSyncState = (deviceKey: string, patch: Partial<PosSyncState>) => {
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
      queueSize: loadQueuedSales().length,
    };

  const next = {
    ...current,
    ...patch,
    deviceKey,
  };

  savePosSyncState(next);
  return next;
};

export const loadQueuedSales = () => read<PosSaleInput[]>(QUEUE_STORAGE) ?? [];

export const saveQueuedSales = (sales: PosSaleInput[]) => write(QUEUE_STORAGE, sales);

export const queuePosSale = (sale: PosSaleInput) => {
  const current = loadQueuedSales();
  const next = [...current, sale];
  saveQueuedSales(next);
  if (sale.deviceKey) {
    patchPosSyncState(sale.deviceKey, { queueSize: next.length });
  }
};

export const removeQueuedSale = (saleNumber: string) => {
  const current = loadQueuedSales().filter((sale) => sale.saleNumber !== saleNumber);
  saveQueuedSales(current);
  const deviceKey = current[0]?.deviceKey ?? loadPosSyncState()?.deviceKey;
  if (deviceKey) {
    patchPosSyncState(deviceKey, { queueSize: current.length });
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
