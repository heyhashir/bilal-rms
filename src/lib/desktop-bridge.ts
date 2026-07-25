import type { User } from "@/lib/account-types";
import type { Employee, PosSale, PosSaleInput } from "@/lib/admin-types";
import type { Product, StorefrontSettings } from "@/lib/catalog-types";
import type { PosCache, PosRefundQueueItem, PosSyncState } from "@/lib/pos-local";

export type DesktopUpdateManifest = {
  deviceKey: string;
  currentVersion: string | null;
  latestVersion: string;
  available: boolean;
  mandatory: boolean;
  notes: string;
  publishedAt: number;
  windows: {
    installerUrl: string;
    manifestUrl: string;
  } | null;
};

export type DesktopBridge = {
  isDesktop: true;
  getDeviceKey: () => string;
  loadPosCache: () => PosCache | null;
  savePosCache: (cache: PosCache) => void;
  loadPosSyncState: () => PosSyncState | null;
  savePosSyncState: (state: PosSyncState) => void;
  patchPosSyncState: (patch: Partial<PosSyncState>) => PosSyncState;
  loadQueuedSales: () => PosSaleInput[];
  queuePosSale: (sale: PosSaleInput) => void;
  removeQueuedSale: (saleNumber: string) => void;
  loadQueuedRefunds: () => PosRefundQueueItem[];
  queuePosRefund: (refund: PosRefundQueueItem) => void;
  removeQueuedRefund: (jobKey: string) => void;
  persistOfflineSale: (payload: {
    sale: PosSaleInput;
    employees: Employee[];
    settings: StorefrontSettings | null;
  }) => PosSale;
  persistOfflineRefund: (payload: {
    refund: PosRefundQueueItem;
  }) => PosSale | null;
  rememberReceipt: (sale: PosSale) => void;
  listOfflineReceipts: () => PosSale[];
  getOfflineReceipt: (receiptOrSaleNumber: string) => PosSale | null;
  cacheCurrentUser: (user: User | null) => void;
  getCachedCurrentUser: () => User | null;
  printReceipt: (payload: { sale: PosSale; settings: StorefrontSettings | null }) => Promise<void>;
  checkForUpdates: (payload: { deviceKey: string; currentVersion?: string | null; baseUrl?: string | null }) => Promise<DesktopUpdateManifest>;
  installUpdate: (payload: { installerUrl: string }) => Promise<{ ok: true; installerPath: string }>;
  getDesktopContext: () => {
    appVersion: string;
    appName: string;
    cloudApiBaseUrl: string | null;
    cloudOrigin: string;
  };
};

export const getDesktopBridge = (): DesktopBridge | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.bilalDesktop ?? null;
};

export const isDesktopRuntime = () => Boolean(getDesktopBridge());
