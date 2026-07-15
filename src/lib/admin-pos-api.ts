import { api, toQueryString } from "@/lib/api";
import type { ListMeta, PosSale, PosSaleInput } from "@/lib/admin-types";

export const adminPosApi = {
  posSales: (params?: { page?: number; pageSize?: number; query?: string }) =>
    api.get<{ sales: PosSale[]; meta: ListMeta }>(`/admin/pos-sales${toQueryString(params ?? {})}`),
  posSale: (saleNumber: string) => api.get<{ sale: PosSale }>(`/admin/pos-sales/${saleNumber}`),
  createPosSale: (payload: PosSaleInput) => api.post<{ sale: PosSale }>("/admin/pos-sales", payload),
  refundPosSale: (saleNumber: string, payload: { reason: string; note?: string; items: Array<{ saleItemId: string; qty: number }> }) =>
    api.post<{ sale: PosSale }>(`/admin/pos-sales/${saleNumber}/refunds`, payload),
  recordReprint: (saleNumber: string) => api.post<{ sale: PosSale }>(`/admin/pos-sales/${saleNumber}/reprint`),
  exportUrl: (params?: { query?: string }) => `/api/v1/admin/pos-sales/export${toQueryString(params ?? {})}`,
};
