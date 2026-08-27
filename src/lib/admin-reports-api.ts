import { api, toQueryString } from "@/lib/api";
import type { BillWiseReport, ReportSummary } from "@/lib/admin-types";

export const adminReportsApi = {
  summary: (params?: { from?: string; to?: string }) =>
    api.get<{ summary: ReportSummary }>(`/admin/reports/summary${toQueryString(params ?? {})}`),
  billWise: (params?: {
    from?: string;
    to?: string;
    cashier?: string;
    paymentMethod?: string;
    type?: string;
    query?: string;
  }) => api.get<BillWiseReport>(`/admin/reports/bill-wise${toQueryString(params ?? {})}`),
  exportBillWiseUrl: (params?: {
    from?: string;
    to?: string;
    cashier?: string;
    paymentMethod?: string;
    type?: string;
    query?: string;
  }) => `/api/v1/admin/reports/bill-wise/export${toQueryString(params ?? {})}`,
};
