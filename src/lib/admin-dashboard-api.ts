import { api } from "@/lib/api";
import type { DashboardStats } from "@/lib/admin-types";

export const adminDashboardApi = {
  dashboard: () => api.get<{ dashboard: DashboardStats }>("/admin/dashboard"),
};
