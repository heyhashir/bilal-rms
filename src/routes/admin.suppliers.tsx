import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminBackofficeApi } from "@/lib/admin-backoffice-api";
import { getErrorMessage } from "@/lib/api";
import type { Vendor } from "@/lib/admin-types";
import { queryClient } from "@/lib/query-client";
import { ActionButton, EmptyState, Field, Modal, PageHeader, SelectField, StatusPill, StatCard, Toolbar } from "@/components/admin/primitives";

export const Route = createFileRoute("/admin/suppliers")({
  component: AdminSuppliers,
});

type VendorDraft = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  isActive: boolean;
};

const emptyVendor = (): VendorDraft => ({
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  isActive: true,
});

function AdminSuppliers() {
  const [query, setQuery] = useState("");
  const [editingVendor, setEditingVendor] = useState<VendorDraft | null>(null);

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["admin", "vendors"],
    queryFn: async () => (await adminBackofficeApi.vendors()).vendors,
  });

  const saveVendor = useMutation({
    mutationFn: adminBackofficeApi.saveVendor,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
      setEditingVendor(null);
      toast.success("Vendor saved");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Unable to save vendor")),
  });

  const archiveVendor = useMutation({
    mutationFn: adminBackofficeApi.deleteVendor,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
      toast.success("Vendor archived");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Unable to archive vendor")),
  });

  const filteredVendors = useMemo(
    () =>
      vendors.filter((v) =>
        `${v.name} ${v.phone ?? ""} ${v.email ?? ""} ${v.notes ?? ""} ${v.address ?? ""}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [vendors, query],
  );

  const activeCount = vendors.filter((v) => v.isActive).length;

  return (
    <div>
      <PageHeader
        eyebrow="Inventory & Procurement"
        title={`Vendors & Suppliers (${vendors.length})`}
        description="Directory of manufacturing suppliers and wholesale vendor contacts."
        action={
          <ActionButton onClick={() => setEditingVendor(emptyVendor())}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New Vendor
          </ActionButton>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Total Suppliers" value={vendors.length} hint="Vendor directory" />
        <StatCard label="Active Suppliers" value={activeCount} hint="Available for purchase orders" />
        <StatCard label="Inactive / Archived" value={vendors.length - activeCount} hint="Past vendors" />
      </div>

      <Toolbar search={query} onSearch={setQuery} placeholder="Search vendors by name, phone, email..." />

      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading vendors...</div>
      ) : filteredVendors.length === 0 ? (
        <EmptyState title="No vendors found" hint="Add wholesale manufacturers or suppliers to track inward stock." />
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="p-3 text-left">Company Name</th>
                <th className="p-3 text-left">Phone</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Address</th>
                <th className="p-3 text-left">Notes</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {filteredVendors.map((vendor) => (
                <tr key={vendor.id} className="border-t border-border hover:bg-secondary/30 transition-colors">
                  <td className="p-3 font-semibold">{vendor.name}</td>
                  <td className="p-3 font-mono text-xs">{vendor.phone || "-"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{vendor.email || "-"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{vendor.address || "-"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{vendor.notes || "-"}</td>
                  <td className="p-3">
                    <StatusPill status={vendor.isActive ? "active" : "inactive"} />
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() =>
                          setEditingVendor({
                            id: vendor.id,
                            name: vendor.name,
                            phone: vendor.phone ?? "",
                            email: vendor.email ?? "",
                            address: vendor.address ?? "",
                            notes: vendor.notes ?? "",
                            isActive: vendor.isActive,
                          })
                        }
                        className="p-2 hover:bg-secondary"
                        title="Edit vendor"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Archive ${vendor.name}?`)) {
                            archiveVendor.mutate(vendor.id);
                          }
                        }}
                        className="p-2 hover:bg-sale hover:text-primary-foreground"
                        title="Archive vendor"
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

      {editingVendor && (
        <Modal
          title={editingVendor.id ? "Edit Vendor" : "New Vendor"}
          onClose={() => setEditingVendor(null)}
          footer={
            <>
              <ActionButton variant="ghost" onClick={() => setEditingVendor(null)}>
                Cancel
              </ActionButton>
              <ActionButton
                onClick={() => {
                  if (!editingVendor.name.trim()) return toast.error("Enter vendor name");
                  saveVendor.mutate(editingVendor);
                }}
              >
                Save Vendor
              </ActionButton>
            </>
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field
                label="Company / Vendor Name"
                value={editingVendor.name}
                autoFocus
                onChange={(value) => setEditingVendor({ ...editingVendor, name: value })}
              />
            </div>
            <Field label="Phone" value={editingVendor.phone} onChange={(value) => setEditingVendor({ ...editingVendor, phone: value })} />
            <Field label="Email" type="email" value={editingVendor.email} onChange={(value) => setEditingVendor({ ...editingVendor, email: value })} />
            <div className="md:col-span-2">
              <Field label="Address" value={editingVendor.address} onChange={(value) => setEditingVendor({ ...editingVendor, address: value })} />
            </div>
            <SelectField
              label="Status"
              value={editingVendor.isActive ? "active" : "inactive"}
              onChange={(value) => setEditingVendor({ ...editingVendor, isActive: value === "active" })}
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
            <div className="md:col-span-2">
              <Field label="Notes" value={editingVendor.notes} onChange={(value) => setEditingVendor({ ...editingVendor, notes: value })} textarea />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
