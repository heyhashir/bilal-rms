import { api, toQueryString } from "@/lib/api";
import type { AdminCustomer, ListMeta } from "@/lib/admin-types";

export const adminCustomersApi = {
  customers: (params?: { page?: number; pageSize?: number; query?: string }) =>
    api.get<{ customers: AdminCustomer[]; meta: ListMeta }>(`/admin/customers${toQueryString(params ?? {})}`),
  exportUrl: (params?: { query?: string }) => `/api/v1/admin/customers/export${toQueryString(params ?? {})}`,
};
