import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminBackofficeApi } from "@/lib/admin-backoffice-api";
import { adminCatalogApi } from "@/lib/admin-catalog-api";
import { getErrorMessage } from "@/lib/api";
import type { Vendor } from "@/lib/admin-types";
import type { Product } from "@/lib/catalog-types";
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
  const [viewingVendorProducts, setViewingVendorProducts] = useState<Vendor | null>(null);
  const [purchaseVendorFilter, setPurchaseVendorFilter] = useState("");
  const [purchaseReversal, setPurchaseReversal] = useState<{ id: string; label: string; reason: string } | null>(null);
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
  const reversePurchase = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminBackofficeApi.reverseVendorPurchase(id, reason),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "vendor-purchases"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "reports"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] }),
      ]);
      setPurchaseReversal(null);
      toast.success("Purchase reversed; stock and ledger were corrected");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Unable to reverse purchase")),
  });

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === purchase.productId),
    [products, purchase.productId],
  );

  const filteredPurchases = useMemo(() => {
    if (!purchaseVendorFilter) return purchases;
    return purchases.filter((p) => p.vendorId === purchaseVendorFilter);
  }, [purchases, purchaseVendorFilter]);

  const companyStats = useMemo(() => {
    const active = filteredPurchases.filter((p) => !p.reversedAt);
    const totalSpend = active.reduce((sum, p) => sum + p.quantity * p.unitCost, 0);
    const totalUnits = active.reduce((sum, p) => sum + p.quantity, 0);
    return { count: active.length, totalSpend, totalUnits };
  }, [filteredPurchases]);

  return (
    <div>
      <PageHeader
        eyebrow="Vendors"
        title="Vendors and stock intake."
        description="Manage suppliers, review company-wise purchase summaries, and check wholesale vs. retail prices."
        action={
          <ActionButton onClick={() => setEditingVendor({ name: "", phone: "", email: "", address: "", notes: "", isActive: true })}>
            <Plus className="h-3.5 w-3.5" /> Add vendor
          </ActionButton>
        }
      />

      <Tabs
        items={[
          { key: "vendors", label: `Vendors (${vendors.length})` },
          { key: "purchases", label: `Purchases (${purchases.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "vendors" ? (
        <div className="overflow-x-auto border border-border">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="p-3 text-left">Vendor / Company</th>
                <th className="p-3 text-left">Phone</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => {
                const vendorPurchases = purchases.filter((p) => p.vendorId === vendor.id && !p.reversedAt);
                const vendorSpend = vendorPurchases.reduce((sum, p) => sum + p.quantity * p.unitCost, 0);

                return (
                  <tr key={vendor.id} className="border-t border-border">
                    <td className="p-3">
                      <div className="font-medium">{vendor.name}</div>
                      <div className="text-xs text-muted-foreground">{vendor.address || "No address"}</div>
                      {vendorSpend > 0 && (
                        <div className="mt-0.5 text-[11px] text-muted-foreground">Total spent: Rs. {vendorSpend.toLocaleString()}</div>
                      )}
                    </td>
                    <td className="p-3">{vendor.phone || "—"}</td>
                    <td className="p-3">{vendor.email || "—"}</td>
                    <td className="p-3"><StatusPill status={vendor.isActive ? "active" : "inactive"} /></td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <ActionButton variant="ghost" onClick={() => setViewingVendorProducts(vendor)}>
                          Products & Pricing
                        </ActionButton>
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
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border border-border bg-secondary/30 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Filter by company:</span>
              <select
                value={purchaseVendorFilter}
                onChange={(e) => setPurchaseVendorFilter(e.target.value)}
                className="border border-border bg-background px-3 py-1.5 text-sm"
              >
                <option value="">All Companies / Vendors</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-4 text-xs">
              <div>Purchases: <span className="font-semibold">{companyStats.count}</span></div>
              <div>Units received: <span className="font-semibold">{companyStats.totalUnits}</span></div>
              <div>Total spent: <span className="font-semibold">Rs. {companyStats.totalSpend.toLocaleString()}</span></div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="border border-border p-5">
              <div className="mb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">New purchase intake</div>
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
                  <Field label="Unit cost (Wholesale)" type="number" value={purchase.unitCost} onChange={(value) => setPurchase((current) => ({ ...current, unitCost: value }))} />
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
                    <th className="p-3 text-left">Total</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.map((entry) => (
                    <tr key={entry.id} className="border-t border-border">
                      <td className="p-3 font-medium">{entry.vendorName}</td>
                      <td className="p-3">
                        <div>{entry.productName}</div>
                        <div className="text-xs text-muted-foreground">{entry.variantSku || "Base stock"}</div>
                      </td>
                      <td className="p-3">{entry.quantity}</td>
                      <td className="p-3">Rs. {entry.unitCost.toLocaleString()}</td>
                      <td className="p-3 font-medium">Rs. {(entry.quantity * entry.unitCost).toLocaleString()}</td>
                      <td className="p-3 text-xs">{new Date(entry.purchasedAt).toLocaleDateString()}</td>
                      <td className="p-3">
                        <StatusPill status={entry.reversedAt ? "reversed" : "active"} />
                        {entry.reversalReason && <div className="mt-1 max-w-48 text-xs text-muted-foreground">{entry.reversalReason}</div>}
                      </td>
                      <td className="p-3 text-right">
                        {!entry.reversedAt && (
                          <ActionButton
                            variant="danger"
                            onClick={() =>
                              setPurchaseReversal({
                                id: entry.id,
                                label: `${entry.productName}${entry.variantSku ? ` (${entry.variantSku})` : ""}`,
                                reason: "",
                              })
                            }
                          >
                            Reverse
                          </ActionButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </div>
      )}

      {viewingVendorProducts && (
        <VendorProductsModal
          vendor={viewingVendorProducts}
          products={products}
          onClose={() => setViewingVendorProducts(null)}
        />
      )}

      {editingVendor && (
        <VendorModal
          draft={editingVendor}
          onClose={() => setEditingVendor(null)}
          onSave={(payload) => saveVendor.mutate(payload)}
        />
      )}

      {purchaseReversal && (
        <Modal
          title="Reverse vendor purchase"
          onClose={() => setPurchaseReversal(null)}
          footer={
            <>
              <ActionButton variant="ghost" onClick={() => setPurchaseReversal(null)}>Cancel</ActionButton>
              <ActionButton
                variant="danger"
                disabled={purchaseReversal.reason.trim().length < 3 || reversePurchase.isPending}
                onClick={() =>
                  reversePurchase.mutate({
                    id: purchaseReversal.id,
                    reason: purchaseReversal.reason.trim(),
                  })
                }
              >
                {reversePurchase.isPending ? "Reversing..." : "Reverse purchase and correct records"}
              </ActionButton>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This restores the purchase's stock effect and creates a compensating ledger credit for {purchaseReversal.label}.
              The original purchase remains visible for audit.
            </p>
            <Field
              label="Reversal reason"
              value={purchaseReversal.reason}
              onChange={(reason) => setPurchaseReversal((current) => (current ? { ...current, reason } : current))}
              textarea
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

function VendorProductsModal({
  vendor,
  products,
  onClose,
}: {
  vendor: Vendor;
  products: Product[];
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return products.filter((p) =>
      `${p.name} ${p.brandName || ""} ${p.categoryName || ""}`.toLowerCase().includes(search.toLowerCase()),
    );
  }, [products, search]);

  return (
    <Modal
      title={`Product catalog & pricing - ${vendor.name}`}
      onClose={onClose}
      wide
      footer={<ActionButton variant="ghost" onClick={onClose}>Close</ActionButton>}
    >
      <div className="space-y-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products by name, brand, or category..."
          className="w-full border border-border bg-background px-3 py-2 text-sm"
        />

        <div className="overflow-x-auto border border-border">
          <table className="min-w-[680px] w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="p-3 text-left">Product</th>
                <th className="p-3 text-left">Barcode / SKU</th>
                <th className="p-3 text-left">Stock</th>
                <th className="p-3 text-left">Wholesale (Cost)</th>
                <th className="p-3 text-left">Retail (Sale)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                return (
                  <tr key={product.id} className="border-t border-border">
                    <td className="p-3">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">{product.categoryName} {product.brandName ? `· ${product.brandName}` : ""}</div>
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {product.barcode || product.slug}
                    </td>
                    <td className="p-3">{product.stock}</td>
                    <td className="p-3 font-medium text-amber-700 dark:text-amber-400">
                      {product.costPrice ? `Rs. ${product.costPrice.toLocaleString()}` : "Not set"}
                    </td>
                    <td className="p-3 font-semibold">
                      {product.salePrice ? (
                        <span>
                          Rs. {product.salePrice.toLocaleString()} <span className="text-xs line-through text-muted-foreground">Rs. {product.price.toLocaleString()}</span>
                        </span>
                      ) : (
                        `Rs. ${product.price.toLocaleString()}`
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
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
