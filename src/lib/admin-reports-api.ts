import { api, toQueryString } from "@/lib/api";
import type { ReportSummary } from "@/lib/admin-types";

export const adminReportsApi = {
  summary: (params?: { from?: string; to?: string }) =>
    api.get<{ summary: ReportSummary }>(`/admin/reports/summary${toQueryString(params ?? {})}`),
};
