import { api, toQueryString } from "@/lib/api";
import type {
  InventoryMovementEntry,
  InventorySnapshotItem,
  InventoryValuationReport,
  ListMeta,
} from "@/lib/admin-types";

export const adminInventoryApi = {
  inventorySnapshot: () => api.get<{ products: InventorySnapshotItem[] }>("/admin/inventory/snapshot"),
  inventoryLedger: (params?: { page?: number; pageSize?: number; query?: string }) =>
    api.get<{ movements: InventoryMovementEntry[]; meta: ListMeta }>(`/admin/inventory/ledger${toQueryString(params ?? {})}`),
  inventoryValuation: (params?: { categoryId?: string; brandId?: string; inStockOnly?: boolean; query?: string }) =>
    api.get<InventoryValuationReport>(`/admin/inventory/valuation${toQueryString(params ?? {})}`),
  adjustInventory: (payload: { productId: string; variantId?: string | null; delta: number; note?: string }) =>
    api.post<{ ok: boolean }>("/admin/inventory/adjust", payload),
  exportLedgerUrl: (params?: { query?: string }) => `/api/v1/admin/inventory/ledger/export${toQueryString(params ?? {})}`,
  exportValuationUrl: (params?: { categoryId?: string; brandId?: string; inStockOnly?: boolean; query?: string }) =>
    `/api/v1/admin/inventory/valuation/export${toQueryString(params ?? {})}`,
};
