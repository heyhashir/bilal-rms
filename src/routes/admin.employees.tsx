import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { adminEmployeesApi } from "@/lib/admin-employees-api";
import type { Employee } from "@/lib/admin-types";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { ActionButton, EmptyState, Field, Modal, PageHeader, SelectField, StatusPill, Toolbar } from "@/components/admin/primitives";

export const Route = createFileRoute("/admin/employees")({
  component: AdminEmployees,
});

const emptyEmployee = (): Employee => ({
  id: "",
  name: "",
  phone: "",
  commissionRate: 0,
  status: "active",
  notes: "",
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

function AdminEmployees() {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Employee | null>(null);
  const { data: employees = [] } = useQuery({
    queryKey: queryKeys.admin.employees,
    queryFn: async () => (await adminEmployeesApi.employees()).employees,
  });
  const archiveEmployee = useMutation({
    mutationFn: adminEmployeesApi.deleteEmployee,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.employees });
      toast.success("Employee archived");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to archive employee"));
    },
  });
  const saveEmployee = useMutation({
    mutationFn: (payload: Partial<Employee> & { name: string }) => adminEmployeesApi.saveEmployee(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.employees });
      toast.success("Employee saved");
      setEditing(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to save employee"));
    },
  });

  const filtered = useMemo(
    () =>
      employees.filter((employee) =>
        `${employee.name} ${employee.phone} ${employee.status} ${employee.notes}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [employees, query],
  );

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title={`Employees (${employees.length})`}
        description="Staff master records used for POS attribution and commission tracking."
        action={
          <ActionButton onClick={() => setEditing(emptyEmployee())}>
            <Plus className="h-3.5 w-3.5" /> New employee
          </ActionButton>
        }
      />
      <Toolbar search={query} onSearch={setQuery} />
      {filtered.length === 0 ? (
        <EmptyState title="No employees yet" hint="Add shop staff so POS lines can be attributed for commission." />
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Phone</th>
                <th className="p-3 text-left">Commission</th>
                <th className="p-3 text-left">Notes</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Updated</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((employee) => (
                <tr key={employee.id} className="border-t border-border">
                  <td className="p-3 font-medium">{employee.name}</td>
                  <td className="p-3">{employee.phone || "-"}</td>
                  <td className="p-3">{employee.commissionRate}%</td>
                  <td className="p-3 text-muted-foreground">{employee.notes || "-"}</td>
                  <td className="p-3">
                    <StatusPill status={employee.status} />
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(employee.updatedAt).toLocaleString()}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditing(employee)} className="p-2 hover:bg-secondary">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Archive ${employee.name}?`)) return;
                          archiveEmployee.mutate(employee.id);
                        }}
                        className="p-2 hover:bg-sale hover:text-primary-foreground"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal
          title={editing.id ? "Edit employee" : "New employee"}
          onClose={() => setEditing(null)}
          footer={
            <>
              <ActionButton variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </ActionButton>
              <ActionButton
                onClick={async () => {
                  saveEmployee.mutate({
                    id: editing.id || undefined,
                    name: editing.name,
                    phone: editing.phone,
                    commissionRate: editing.commissionRate,
                    status: editing.status,
                    notes: editing.notes,
                  });
                }}
              >
                Save
              </ActionButton>
            </>
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Full name" value={editing.name} onChange={(value) => setEditing({ ...editing, name: value })} />
            <Field label="Phone" value={editing.phone} onChange={(value) => setEditing({ ...editing, phone: value })} />
            <Field
              label="Commission %"
              type="number"
              value={String(editing.commissionRate)}
              onChange={(value) => setEditing({ ...editing, commissionRate: Number(value) || 0 })}
            />
            <SelectField
              label="Status"
              value={editing.status}
              onChange={(value) => setEditing({ ...editing, status: value as Employee["status"] })}
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
            <Field label="Notes" value={editing.notes} onChange={(value) => setEditing({ ...editing, notes: value })} textarea />
          </div>
        </Modal>
      )}
    </div>
  );
}
