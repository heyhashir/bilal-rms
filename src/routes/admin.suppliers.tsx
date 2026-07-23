import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminBackofficeApi } from "@/lib/admin-backoffice-api";
import { adminCatalogApi } from "@/lib/admin-catalog-api";
import { getErrorMessage } from "@/lib/api";
import type { Product, Vendor } from "@/lib/admin-types";
import { queryClient } from "@/lib/query-client";
import { ActionButton, Field, Modal, PageHeader, SelectField, StatusPill, Tabs } from "@/components/admin/primitives";

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

function AdminSuppliers() {
  const [tab, setTab] = useState("vendors");
  const [editingVendor, setEditingVendor] = useState<VendorDraft | null>(null);
  const [purchase, setPurchase] = useState({
    vendorId: "",
    productId: "",
    variantId: "",
    quantity: "1",
    unitCost: "0",
    purchasedAt: new Date().toISOString().slice(0, 10),
    note: "",
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["admin", "vendors"],
    queryFn: async () => (await adminBackofficeApi.vendors()).vendors,
  });
  const { data: purchases = [] } = useQuery({
    queryKey: ["admin", "vendor-purchases"],
    queryFn: async () => (await adminBackofficeApi.vendorPurchases()).purchases,
  });
  const { data: products = [] } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => (await adminCatalogApi.products()).products as Product[],
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

  const createPurchase = useMutation({
    mutationFn: adminBackofficeApi.createVendorPurchase,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "vendor-purchases"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "reports"] }),
      ]);
      toast.success("Vendor purchase recorded");
      setPurchase((current) => ({ ...current, quantity: "1", unitCost: "0", note: "" }));
    },
    onError: (error) => toast.error(getErrorMessage(error, "Unable to record vendor purchase")),
  });

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === purchase.productId),
    [products, purchase.productId],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Suppliers"
        title="Vendors and stock intake."
        description="Keep vendor records and convert purchases into inventory restocks plus ledger entries."
        action={
          <ActionButton onClick={() => setEditingVendor({ name: "", phone: "", email: "", address: "", notes: "", isActive: true })}>
            <Plus className="h-3.5 w-3.5" /> Add vendor
          </ActionButton>
        }
      />

      <Tabs
        items={[
          { key: "vendors", label: "Vendors" },
          { key: "purchases", label: "Purchases" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "vendors" ? (
        <div className="overflow-x-auto border border-border">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="p-3 text-left">Vendor</th>
                <th className="p-3 text-left">Phone</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr key={vendor.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="font-medium">{vendor.name}</div>
                    <div className="text-xs text-muted-foreground">{vendor.address || "No address"}</div>
                  </td>
                  <td className="p-3">{vendor.phone || "—"}</td>
                  <td className="p-3">{vendor.email || "—"}</td>
                  <td className="p-3"><StatusPill status={vendor.isActive ? "active" : "inactive"} /></td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <ActionButton variant="ghost" onClick={() => setEditingVendor(vendor)}>Edit</ActionButton>
                      <ActionButton
                        variant="danger"
                        onClick={() => {
                          if (confirm(`Archive ${vendor.name}?`)) {
                            archiveVendor.mutate(vendor.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Archive
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="border border-border p-5">
            <div className="mb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">New purchase</div>
            <div className="grid gap-3">
              <SelectField
                label="Vendor"
                value={purchase.vendorId}
                onChange={(value) => setPurchase((current) => ({ ...current, vendorId: value }))}
                options={[{ value: "", label: "Select vendor" }, ...vendors.map((vendor) => ({ value: vendor.id, label: vendor.name }))]}
              />
              <SelectField
                label="Product"
                value={purchase.productId}
                onChange={(value) => setPurchase((current) => ({ ...current, productId: value, variantId: "" }))}
                options={[{ value: "", label: "Select product" }, ...products.map((product) => ({ value: product.id, label: product.name }))]}
              />
              {selectedProduct?.variants?.length ? (
                <SelectField
                  label="Variant"
                  value={purchase.variantId}
                  onChange={(value) => setPurchase((current) => ({ ...current, variantId: value }))}
                  options={[
                    { value: "", label: "Base product stock" },
                    ...selectedProduct.variants.map((variant) => ({
                      value: variant.id,
                      label: [variant.sku, variant.size, variant.colorName].filter(Boolean).join(" | "),
                    })),
                  ]}
                />
              ) : null}
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Quantity" type="number" value={purchase.quantity} onChange={(value) => setPurchase((current) => ({ ...current, quantity: value }))} />
                <Field label="Unit cost" type="number" value={purchase.unitCost} onChange={(value) => setPurchase((current) => ({ ...current, unitCost: value }))} />
              </div>
              <Field label="Purchase date" type="date" value={purchase.purchasedAt} onChange={(value) => setPurchase((current) => ({ ...current, purchasedAt: value }))} />
              <Field label="Note" value={purchase.note} onChange={(value) => setPurchase((current) => ({ ...current, note: value }))} textarea />
              <ActionButton
                onClick={() =>
                  createPurchase.mutate({
                    vendorId: purchase.vendorId,
                    productId: purchase.productId,
                    variantId: purchase.variantId || null,
                    quantity: Number(purchase.quantity),
                    unitCost: Number(purchase.unitCost),
                    purchasedAt: purchase.purchasedAt,
                    note: purchase.note,
                  })
                }
              >
                Save purchase
              </ActionButton>
            </div>
          </section>

          <section className="overflow-x-auto border border-border">
            <table className="min-w-[720px] w-full text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-widest">
                <tr>
                  <th className="p-3 text-left">Vendor</th>
                  <th className="p-3 text-left">Product</th>
                  <th className="p-3 text-left">Qty</th>
                  <th className="p-3 text-left">Unit cost</th>
                  <th className="p-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((entry) => (
                  <tr key={entry.id} className="border-t border-border">
                    <td className="p-3">{entry.vendorName}</td>
                    <td className="p-3">
                      <div>{entry.productName}</div>
                      <div className="text-xs text-muted-foreground">{entry.variantSku || "Base stock"}</div>
                    </td>
                    <td className="p-3">{entry.quantity}</td>
                    <td className="p-3">Rs. {entry.unitCost.toLocaleString()}</td>
                    <td className="p-3">{new Date(entry.purchasedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {editingVendor && (
        <VendorModal
          draft={editingVendor}
          onClose={() => setEditingVendor(null)}
          onSave={(payload) => saveVendor.mutate(payload)}
        />
      )}
    </div>
  );
}

function VendorModal({
  draft,
  onClose,
  onSave,
}: {
  draft: VendorDraft | Vendor;
  onClose: () => void;
  onSave: (payload: VendorDraft | Vendor) => void;
}) {
  const [form, setForm] = useState(draft);

  return (
    <Modal
      title={form.id ? "Edit vendor" : "New vendor"}
      onClose={onClose}
      footer={
        <>
          <ActionButton variant="ghost" onClick={onClose}>Cancel</ActionButton>
          <ActionButton onClick={() => onSave(form)}>Save</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
        <Field label="Phone" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
        <Field label="Email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
        <Field label="Address" value={form.address} onChange={(value) => setForm((current) => ({ ...current, address: value }))} />
        <Field label="Notes" value={form.notes} onChange={(value) => setForm((current) => ({ ...current, notes: value }))} textarea />
        <label className="flex items-center gap-2 text-xs uppercase tracking-widest">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
          />
          Active
        </label>
      </div>
    </Modal>
  );
}
