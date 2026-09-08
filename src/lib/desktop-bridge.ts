import type { User } from "@/lib/account-types";
import type { Employee, PosExchangeInput, PosSale, PosSaleInput } from "@/lib/admin-types";
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
    sha256: string | null;
    size: number | null;
  } | null;
};

export type ReceiptPrinterProfile = {
  printerName: string;
  rollWidthMm: number;
  paddingMm: number;
  feedOffsetMm: number;
  copies: number;
  landscape: boolean;
};

export type StickerPrinterProfile = {
  printerName: string;
  widthMm: number;
  heightMm: number;
  orientation: 0 | 90 | 180 | 270;
  offsetXmm: number;
  offsetYmm: number;
  gapMm: number;
  copies: number;
  design: "standard" | "compact" | "branded";
};

export type PrinterProfiles = { receipt: ReceiptPrinterProfile | null; sticker: StickerPrinterProfile | null };

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
  loadQueuedExchanges: () => PosExchangeInput[];
  queuePosExchange: (exchange: PosExchangeInput) => void;
  removeQueuedExchange: (jobKey: string) => void;
  persistOfflineSale: (payload: {
    sale: PosSaleInput;
    employees: Employee[];
    settings: StorefrontSettings | null;
  }) => PosSale;
  persistOfflineRefund: (payload: {
    refund: PosRefundQueueItem;
  }) => PosSale | null;
  persistOfflineExchange: (payload: {
    exchange: PosExchangeInput;
    employees: Employee[];
    settings: StorefrontSettings | null;
  }) => PosSale | null;
  rememberReceipt: (sale: PosSale) => void;
  listOfflineReceipts: () => PosSale[];
  getOfflineReceipt: (receiptOrSaleNumber: string) => PosSale | null;
  cacheCurrentUser: (user: User | null) => void;
  getCachedCurrentUser: () => User | null;
  printReceipt: (payload: { sale: PosSale; settings: StorefrontSettings | null }) => Promise<void>;
  printStickers?: (payload: {
    html: string;
    widthMm?: number;
    heightMm?: number;
    landscape?: boolean;
    orientation?: 0 | 90 | 180 | 270;
  }) => Promise<{ ok: true }>;
  listPrinters: () => Promise<Array<{ name: string; displayName: string; isDefault: boolean }>>;
  getPrinterProfiles: () => PrinterProfiles;
  getPrintPairing?: () => Promise<{ token: string; error: string | null }>;
  savePrinterProfiles: (profiles: PrinterProfiles) => PrinterProfiles;
  checkForUpdates: (payload: { deviceKey: string; currentVersion?: string | null; baseUrl?: string | null }) => Promise<DesktopUpdateManifest>;
  installUpdate: (payload: {
    installerUrl: string;
    expectedSha256?: string | null;
    expectedSize?: number | null;
  }) => Promise<{ ok: true; installerPath: string }>;
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
