import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { adminBackofficeApi } from "@/lib/admin-backoffice-api";
import { adminCatalogApi } from "@/lib/admin-catalog-api";
import { getErrorMessage } from "@/lib/api";
import type { Product } from "@/lib/catalog-types";
import { queryClient } from "@/lib/query-client";
import { ActionButton, EmptyState, Field, Modal, PageHeader, QueryErrorState, SelectField, StatCard } from "@/components/admin/primitives";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/admin/vendor-purchases")({
  component: AdminVendorPurchases,
});

function AdminVendorPurchases() {
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

  const { data: purchases = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "vendor-purchases"],
    queryFn: async () => (await adminBackofficeApi.vendorPurchases()).purchases,
  });

  const {
    data: products = [],
    isError: isProductsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => (await adminCatalogApi.products()).products as Product[],
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
    onError: (error) => toast.error(getErrorMessage(error, "Unable to reverse vendor purchase")),
  });

  const selectedProduct = products.find((product) => product.id === purchase.productId);

  const filteredPurchases = useMemo(
    () =>
      purchaseVendorFilter
        ? purchases.filter((item) => item.vendorId === purchaseVendorFilter)
        : purchases,
    [purchases, purchaseVendorFilter],
  );

  const companyStats = useMemo(() => {
    const list = filteredPurchases.filter((p) => !p.reversedAt);
    const count = list.length;
    const totalUnits = list.reduce((sum, p) => sum + p.quantity, 0);
    const totalSpend = list.reduce((sum, p) => sum + p.totalCost, 0);
    return { count, totalUnits, totalSpend };
  }, [filteredPurchases]);

  return (
    <div>
      <PageHeader
        eyebrow="Wholesale & Procurement"
        title="Vendor purchases & stock intake."
        description="Record wholesale stock shipments from manufacturing vendors, inward unit costs, and invoice audit trails."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Total Inward Purchases" value={companyStats.count} hint="Active non-reversed invoices" />
        <StatCard label="Total Units Received" value={`${companyStats.totalUnits} pcs`} hint="Added to live inventory" />
        <StatCard label="Total Wholesale Spend" value={formatPrice(companyStats.totalSpend)} hint="Capital invested in stock" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        {/* Intake Form */}
        <section className="border border-border p-5">
          <div className="mb-4">
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">New purchase intake</div>
            <div className="mt-1 text-sm text-muted-foreground">Receives physical items directly into on-hand stock and updates weighted unit costs.</div>
          </div>
          <div className="grid gap-3">
            <SelectField
              label="Vendor / Supplier"
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
              <Field label="Quantity (Pcs)" type="number" value={purchase.quantity} onChange={(value) => setPurchase((current) => ({ ...current, quantity: value }))} />
              <Field label="Unit Cost PKR (Wholesale)" type="number" value={purchase.unitCost} onChange={(value) => setPurchase((current) => ({ ...current, unitCost: value }))} />
            </div>
            <Field label="Purchase Date" type="date" value={purchase.purchasedAt} onChange={(value) => setPurchase((current) => ({ ...current, purchasedAt: value }))} />
            <Field label="Note / Bill #" value={purchase.note} placeholder="e.g. Lot #, Invoice #" onChange={(value) => setPurchase((current) => ({ ...current, note: value }))} textarea />
            <ActionButton
              disabled={isProductsError}
              onClick={() => {
                if (!purchase.vendorId) return toast.error("Select a vendor");
                if (!purchase.productId) return toast.error("Select a product");
                if (Number(purchase.quantity) <= 0) return toast.error("Quantity must be greater than 0");
                createPurchase.mutate({
                  vendorId: purchase.vendorId,
                  productId: purchase.productId,
                  variantId: purchase.variantId || null,
                  quantity: Number(purchase.quantity),
                  unitCost: Number(purchase.unitCost),
                  purchasedAt: purchase.purchasedAt,
                  note: purchase.note,
                });
              }}
            >
              Record Inward Purchase
            </ActionButton>
          </div>
        </section>

        {/* Purchases History */}
        <section className="border border-border">
          <div className="border-b border-border p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Inward Purchase History</div>
              <div className="mt-1 text-xs text-muted-foreground">Showing {filteredPurchases.length} purchase records</div>
            </div>
            <select
              value={purchaseVendorFilter}
              onChange={(e) => setPurchaseVendorFilter(e.target.value)}
              className="border border-border bg-background px-3 py-1.5 text-xs"
            >
              <option value="">All Vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {isError ? (
            <QueryErrorState title="Purchase history could not be loaded" onRetry={() => void refetch()} />
          ) : isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading purchases...</div>
          ) : filteredPurchases.length === 0 ? (
            <EmptyState title="No purchases recorded" hint="Use the intake form on the left to record incoming vendor stock." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[640px] w-full text-sm">
                <thead className="bg-secondary text-xs uppercase tracking-widest">
                  <tr>
                    <th className="p-3 text-left">Vendor</th>
                    <th className="p-3 text-left">Product</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3 text-right">Cost</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.map((item) => (
                    <tr key={item.id} className={`border-t border-border hover:bg-secondary/30 transition-colors ${item.reversedAt ? "bg-muted/40 opacity-60" : ""}`}>
                      <td className="p-3 font-medium">{item.vendorName}</td>
                      <td className="p-3">
                        <div>{item.productName}</div>
                        {item.variantSku ? (
                          <div className="text-xs text-muted-foreground uppercase font-mono">
                            {item.variantSku}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-3 text-right font-semibold">{item.quantity}</td>
                      <td className="p-3 text-right font-mono">{formatPrice(item.unitCost)}</td>
                      <td className="p-3 text-right font-mono font-semibold">{formatPrice(item.totalCost)}</td>
                      <td className="p-3 text-xs text-muted-foreground font-mono">{item.purchasedAt ? new Date(item.purchasedAt).toLocaleDateString() : "-"}</td>
                      <td className="p-3">
                        {item.reversedAt ? (
                          <span className="text-xs uppercase text-muted-foreground font-semibold">Reversed</span>
                        ) : (
                          <ActionButton
                            variant="ghost"
                            onClick={() =>
                              setPurchaseReversal({
                                id: item.id,
                                label: `${item.vendorName} - ${item.productName} (${item.quantity} pcs)`,
                                reason: "",
                              })
                            }
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reverse
                          </ActionButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {isProductsError && (
        <div className="mt-4">
          <QueryErrorState
            title="Products could not be loaded for stock intake"
            hint="Purchase creation is disabled until product inventory is available."
            onRetry={() => void refetchProducts()}
          />
        </div>
      )}

      {purchaseReversal && (
        <Modal
          title="Reverse Vendor Purchase"
          onClose={() => setPurchaseReversal(null)}
          footer={
            <>
              <ActionButton variant="ghost" onClick={() => setPurchaseReversal(null)}>
                Cancel
              </ActionButton>
              <ActionButton
                variant="danger"
                onClick={() => {
                  if (!purchaseReversal.reason.trim()) return toast.error("Enter a reversal reason");
                  reversePurchase.mutate({ id: purchaseReversal.id, reason: purchaseReversal.reason });
                }}
              >
                Confirm Reversal
              </ActionButton>
            </>
          }
        >
          <div className="grid gap-3 text-sm">
            <div>
              Reversing this purchase will safely deduct the received quantity from inventory and create a balancing ledger entry.
            </div>
            <div className="font-semibold text-foreground">{purchaseReversal.label}</div>
            <Field
              label="Reversal Reason"
              value={purchaseReversal.reason}
              placeholder="e.g. Return to vendor, Data entry error"
              onChange={(value) => setPurchaseReversal((current) => current ? { ...current, reason: value } : null)}
              autoFocus
              textarea
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
