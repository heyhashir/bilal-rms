import { api, toQueryString } from "@/lib/api";
import type { CommissionEntry, ListMeta } from "@/lib/admin-types";

export const adminCommissionsApi = {
  commissions: (params?: { page?: number; pageSize?: number; query?: string }) =>
    api.get<{ commissions: CommissionEntry[]; meta: ListMeta }>(`/admin/commissions${toQueryString(params ?? {})}`),
  updateCommission: (id: string, payload: { status: "earned" | "reversed" | "paid"; note?: string }) =>
    api.patch<{ commission: CommissionEntry }>(`/admin/commissions/${id}`, payload),
  exportUrl: (params?: { query?: string }) => `/api/v1/admin/commissions/export${toQueryString(params ?? {})}`,
};
