import { api } from "@/lib/api";
import type { Employee } from "@/lib/admin-types";

export const adminEmployeesApi = {
  employees: () => api.get<{ employees: Employee[] }>("/admin/employees"),
  saveEmployee: (payload: Partial<Employee> & { name: string }) =>
    api.post<{ employee: Employee }>("/admin/employees", payload),
  deleteEmployee: (id: string) => api.delete<{ ok: boolean }>(`/admin/employees/${id}`),
};
