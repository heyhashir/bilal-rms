import { api, toQueryString } from "@/lib/api";
import type { ListMeta, ReturnRequest } from "@/lib/admin-types";
import type { Order } from "@/lib/account-types";

export const adminOrdersApi = {
  orders: (params?: { page?: number; pageSize?: number; query?: string }) =>
    api.get<{ orders: Order[]; meta: ListMeta }>(`/admin/orders${toQueryString(params ?? {})}`),
  updateOrderStatus: (orderNumber: string, payload: { orderStatus?: string; paymentStatus?: string }) =>
    api.patch<{ order: Order }>(`/admin/orders/${orderNumber}/status`, payload),
  returns: () => api.get<{ returns: ReturnRequest[] }>("/admin/returns"),
  updateReturn: (id: string, payload: { status: string; refundAmount?: number | null; note?: string }) =>
    api.patch<{ request: ReturnRequest }>(`/admin/returns/${id}`, payload),
  exportUrl: (params?: { query?: string }) => `/api/v1/admin/orders/export${toQueryString(params ?? {})}`,
};
