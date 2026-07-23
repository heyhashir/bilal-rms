import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { adminInventoryApi } from "@/lib/admin-inventory-api";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { ActionButton, EmptyState, Field, Modal, PageHeader, Pagination, SelectField, StatCard, Tabs, Toolbar } from "@/components/admin/primitives";

export const Route = createFileRoute("/admin/inventory")({
  component: AdminInventory,
});

const tabs = [
  { key: "current", label: "Current stock" },
  { key: "low", label: "Low stock" },
  { key: "ledger", label: "Movement ledger" },
];

function AdminInventory() {
  const [tab, setTab] = useState("current");
  const [query, setQuery] = useState("");
  const [ledgerPage, setLedgerPage] = useState(1);
  const [adjustment, setAdjustment] = useState<{ productId: string; variantId?: string; delta: number; note: string } | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: queryKeys.admin.inventorySnapshot,
    queryFn: async () => (await adminInventoryApi.inventorySnapshot()).products,
  });
  const { data: ledgerResponse } = useQuery({
    queryKey: queryKeys.admin.inventoryLedgerList({ page: ledgerPage, query }),
    queryFn: async () => adminInventoryApi.inventoryLedger({ page: ledgerPage, pageSize: 50, query }),
  });
  const movements = ledgerResponse?.movements ?? [];
  const ledgerMeta = ledgerResponse?.meta;

  const selectedProduct = adjustment
    ? products.find((product) => product.id === adjustment.productId) ?? null
    : null;

  const adjustStock = useMutation({
    mutationFn: adminInventoryApi.adjustInventory,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.inventorySnapshot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.inventoryLedger }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.products }),
      ]);
      toast.success("Stock updated");
      setAdjustment(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to adjust stock"));
    },
  });

  const inStock = products.reduce((sum, product) => sum + product.stock, 0);
  const lowCount = products.filter((product) => product.stock > 0 && product.stock <= 5).length;
  const outCount = products.filter((product) => product.stock === 0).length;
  const rows = useMemo(
    () =>
      products.filter((product) => {
        if (tab === "low" && !product.lowStock) return false;
        if (tab === "ledger") return false;
        return `${product.name} ${product.slug} ${product.categoryName}`.toLowerCase().includes(query.toLowerCase());
      }),
    [products, query, tab],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Inventory"
        title="Stock & movements."
        description="Use the live stock snapshot for on-hand quantities and the ledger for an auditable movement trail."
        action={
          <>
            {tab === "ledger" && (
              <ActionButton variant="ghost" onClick={() => window.open(adminInventoryApi.exportLedgerUrl({ query }), "_blank")}>Export CSV</ActionButton>
            )}
            <ActionButton onClick={() => setAdjustment({ productId: products[0]?.id ?? "", delta: 0, note: "" })}><Plus className="h-3.5 w-3.5" /> Adjust stock</ActionButton>
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Units in stock" value={inStock} />
        <StatCard label="SKUs tracked" value={products.length} />
        <StatCard label="Low stock" value={lowCount} tone={lowCount > 0 ? "down" : "flat"} />
        <StatCard label="Out of stock" value={outCount} tone={outCount > 0 ? "down" : "flat"} />
      </div>

      <Tabs items={tabs} active={tab} onChange={setTab} />
      <Toolbar
        search={query}
        onSearch={(value) => {
          setQuery(value);
          setLedgerPage(1);
        }}
      />
      {tab === "ledger" ? (
        movements.length === 0 ? (
          <EmptyState title="No inventory movements found" hint="Try changing the search term or create a stock-changing action first." />
        ) : (
          <>
            <div className="overflow-x-auto border border-border">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-secondary text-xs uppercase tracking-widest">
                  <tr>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Product</th>
                    <th className="p-3 text-left">Variant</th>
                    <th className="p-3 text-left">Reason</th>
                    <th className="p-3 text-left">Source</th>
                    <th className="p-3 text-left">Delta</th>
                    <th className="p-3 text-left">Reference</th>
                    <th className="p-3 text-left">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id} className="border-t border-border">
                      <td className="p-3 text-xs text-muted-foreground">{new Date(movement.createdAt).toLocaleString()}</td>
                      <td className="p-3">
                        <div className="font-medium">{movement.productName}</div>
                        <div className="text-xs text-muted-foreground">{movement.categoryName}</div>
                      </td>
                      <td className="p-3">{movement.variantSku || "Base product"}</td>
                      <td className="p-3 uppercase">{movement.reason.replaceAll("_", " ")}</td>
                      <td className="p-3 uppercase">{movement.source || "manual"}</td>
                      <td className={`p-3 font-semibold ${movement.delta < 0 ? "text-sale" : "text-accent-foreground"}`}>
                        {movement.delta > 0 ? `+${movement.delta}` : movement.delta}
                      </td>
                      <td className="p-3 text-xs">{movement.reference || movement.orderNumber || movement.posSaleNumber || "—"}</td>
                      <td className="p-3 text-muted-foreground">{movement.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={ledgerMeta?.page ?? ledgerPage} pages={ledgerMeta?.pages ?? 1} onChange={setLedgerPage} />
          </>
        )
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing here" hint="Try adjusting your filters." />
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="min-w-[860px] w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="p-3 text-left">Product</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Stock mode</th>
                <th className="p-3 text-left">On hand</th>
                <th className="p-3 text-left">Variant summary</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((product) => (
                <tr key={product.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-xs text-muted-foreground">/{product.slug}</div>
                  </td>
                  <td className="p-3">{product.categoryName}</td>
                  <td className="p-3 uppercase">{product.stockMode}</td>
                  <td className="p-3 font-semibold">{product.stock}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {product.variants.length === 0
                      ? "Base product only"
                      : product.variants
                          .filter((variant) => variant.isActive)
                          .slice(0, 3)
                          .map((variant) => `${variant.sku} (${variant.stock})`)
                          .join(", ")}
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => setAdjustment({ productId: product.id, variantId: product.variants[0]?.id, delta: 0, note: "" })} className="text-xs uppercase tracking-widest underline">Adjust</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adjustment && (
        <Modal
          title="Stock adjustment"
          onClose={() => setAdjustment(null)}
          footer={
            <>
              <ActionButton variant="ghost" onClick={() => setAdjustment(null)}>Cancel</ActionButton>
              <ActionButton
                onClick={async () => {
                  if (!adjustment.delta) return toast.error("Enter a quantity (+/-)");
                  adjustStock.mutate({
                    productId: adjustment.productId,
                    variantId: selectedProduct?.variants.length ? adjustment.variantId ?? null : null,
                    delta: adjustment.delta,
                    note: adjustment.note,
                  });
                }}
              >
                Apply
              </ActionButton>
            </>
          }
        >
          <div className="space-y-3">
            <SelectField
              label="Product"
              value={adjustment.productId}
              onChange={(v) => {
                const product = products.find((entry) => entry.id === v);
                setAdjustment({
                  ...adjustment,
                  productId: v,
                  variantId: product?.variants[0]?.id,
                });
              }}
              options={products.map((product) => ({ value: product.id, label: `${product.name} · ${product.stock} on hand` }))}
            />
            {selectedProduct && selectedProduct.variants.length > 0 && (
              <SelectField
                label="Variant"
                value={adjustment.variantId ?? selectedProduct.variants[0]?.id ?? ""}
                onChange={(v) => setAdjustment({ ...adjustment, variantId: v })}
                options={selectedProduct.variants.map((variant) => ({
                  value: variant.id,
                  label: `${variant.sku} · ${variant.size || "One size"} · ${variant.colorName || "Default"} · ${variant.stock} in stock`,
                }))}
              />
            )}
            <Field label="Quantity change (±)" type="number" value={String(adjustment.delta)} onChange={(v) => setAdjustment({ ...adjustment, delta: Number(v) })} />
            <Field label="Note" value={adjustment.note} onChange={(v) => setAdjustment({ ...adjustment, note: v })} textarea />
          </div>
        </Modal>
      )}
    </div>
  );
}
