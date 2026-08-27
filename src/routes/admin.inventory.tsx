import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { adminInventoryApi } from "@/lib/admin-inventory-api";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { ActionButton, EmptyState, Field, Modal, PageHeader, Pagination, SelectField, StatCard, Tabs, Toolbar } from "@/components/admin/primitives";
import { adminCatalogApi } from "@/lib/admin-catalog-api";
import type { Product } from "@/lib/catalog-types";
import { BarcodeStickerModal } from "@/components/admin/BarcodeStickerModal";

export const Route = createFileRoute("/admin/inventory")({
  component: AdminInventory,
});

const tabs = [
  { key: "current", label: "Current Stock" },
  { key: "low", label: "Low Stock Alert" },
  { key: "ledger", label: "Movement Ledger" },
];

function AdminInventory() {
  const [tab, setTab] = useState("current");
  const [query, setQuery] = useState("");
  const [ledgerPage, setLedgerPage] = useState(1);
  const [adjustment, setAdjustment] = useState<{ productId: string; variantId?: string; delta: number; note: string } | null>(null);
  const [printProduct, setPrintProduct] = useState<Product | null>(null);

  const { data: products = [], isLoading: isProductsLoading } = useQuery({
    queryKey: queryKeys.admin.inventorySnapshot,
    queryFn: async () => (await adminInventoryApi.inventorySnapshot()).products,
  });
  const { data: catalogProducts = [] } = useQuery({
    queryKey: queryKeys.admin.products,
    queryFn: async () => (await adminCatalogApi.products()).products,
  });
  const { data: ledgerResponse, isLoading: isLedgerLoading } = useQuery({
    queryKey: queryKeys.admin.inventoryLedgerList({ page: ledgerPage, query }),
    queryFn: async () => adminInventoryApi.inventoryLedger({ page: ledgerPage, pageSize: 50, query }),
    enabled: tab === "ledger",
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
        queryClient.invalidateQueries({ queryKey: ["admin", "inventory", "valuation"] }),
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
        title="Stock manager & live inventory."
        description="Monitor on-hand inventory levels, adjust stock counts, print barcode stickers, and view movement history."
        action={
          <>
            {tab === "ledger" && (
              <ActionButton variant="ghost" onClick={() => window.open(adminInventoryApi.exportLedgerUrl({ query }), "_blank")}>
                <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
              </ActionButton>
            )}
            <ActionButton onClick={() => setAdjustment({ productId: products[0]?.id ?? "", delta: 0, note: "" })}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adjust Stock
            </ActionButton>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Units in Stock" value={`${inStock} pcs`} hint="Live physical inventory" />
        <StatCard label="Unique SKUs Tracked" value={products.length} hint="Active catalog items" />
        <StatCard label="Low Stock Items" value={lowCount} tone={lowCount > 0 ? "down" : "flat"} hint="5 or fewer pieces remaining" />
        <StatCard label="Out of Stock Items" value={outCount} tone={outCount > 0 ? "down" : "flat"} hint="Immediate reorder needed" />
      </div>

      <Tabs items={tabs} active={tab} onChange={setTab} />

      <Toolbar search={query} onSearch={setQuery} placeholder="Search stock by product name, SKU, or category..." />

      {tab === "ledger" ? (
        isLedgerLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading stock movements...</div>
        ) : movements.length === 0 ? (
          <EmptyState title="No stock movements recorded" hint="Movements from sales, returns, vendor purchases, and manual adjustments will appear here." />
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-border">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-secondary text-xs uppercase tracking-widest">
                  <tr>
                    <th className="p-3 text-left">Time</th>
                    <th className="p-3 text-left">Product</th>
                    <th className="p-3 text-left">Variant</th>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-left">Note / Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id} className="border-t border-border hover:bg-secondary/30 transition-colors">
                      <td className="p-3 text-xs text-muted-foreground font-mono">{new Date(movement.createdAt).toLocaleString()}</td>
                      <td className="p-3 font-medium">{movement.productName}</td>
                      <td className="p-3 text-xs uppercase text-muted-foreground font-mono">
                        {movement.variantName || movement.variantSku || "-"}
                      </td>
                      <td className="p-3 uppercase text-xs">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-secondary">
                          {movement.type}
                        </span>
                      </td>
                      <td className={`p-3 text-right font-mono font-semibold ${movement.quantity < 0 ? "text-sale" : ""}`}>
                        {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{movement.note || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {ledgerMeta && (
              <Pagination
                page={ledgerMeta.page}
                totalPages={ledgerMeta.totalPages}
                totalItems={ledgerMeta.total}
                pageSize={ledgerMeta.pageSize}
                onPageChange={setLedgerPage}
              />
            )}
          </div>
        )
      ) : (
        isProductsLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading stock levels...</div>
        ) : rows.length === 0 ? (
          <EmptyState title="No products found" hint="Try adjusting your search query or check the catalog." />
        ) : (
          <div className="overflow-x-auto border border-border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-widest">
                <tr>
                  <th className="p-3 text-left">Product</th>
                  <th className="p-3 text-left">Category</th>
                  <th className="p-3 text-right">Total Stock</th>
                  <th className="p-3 text-left">Variants Matrix</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((product) => (
                  <tr key={product.id} className="border-t border-border hover:bg-secondary/30 transition-colors">
                    <td className="p-3">
                      <div className="font-semibold">{product.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{product.slug}</div>
                    </td>
                    <td className="p-3 text-xs uppercase text-muted-foreground">{product.categoryName}</td>
                    <td className="p-3 text-right font-mono font-bold text-base">
                      <span className={product.stock === 0 ? "text-sale" : product.stock <= 5 ? "text-amber-600" : ""}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="p-3">
                      {product.variants.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {product.variants.map((variant) => (
                            <span
                              key={variant.id}
                              className={`px-2 py-0.5 text-[11px] font-mono border rounded ${
                                variant.stock === 0
                                  ? "border-sale/40 bg-sale/10 text-sale"
                                  : "border-border bg-secondary/50"
                              }`}
                            >
                              {variant.size || "Standard"}: {variant.stock}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono">Simple product ({product.stock} pcs)</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <ActionButton
                          variant="ghost"
                          onClick={() => {
                            const full = catalogProducts.find((p) => p.id === product.id);
                            if (full) setPrintProduct(full);
                          }}
                        >
                          <Printer className="h-3.5 w-3.5 mr-1" /> Stickers
                        </ActionButton>
                        <ActionButton
                          variant="secondary"
                          onClick={() => setAdjustment({ productId: product.id, delta: 0, note: "" })}
                        >
                          Adjust
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Adjust Stock Modal */}
      {adjustment && (
        <Modal
          title="Adjust Stock"
          onClose={() => setAdjustment(null)}
          footer={
            <>
              <ActionButton variant="ghost" onClick={() => setAdjustment(null)}>
                Cancel
              </ActionButton>
              <ActionButton
                onClick={() => {
                  if (!adjustment.productId) return toast.error("Select a product");
                  if (adjustment.delta === 0) return toast.error("Enter a non-zero quantity change");
                  adjustStock.mutate({
                    productId: adjustment.productId,
                    variantId: adjustment.variantId || undefined,
                    delta: Number(adjustment.delta),
                    note: adjustment.note || undefined,
                  });
                }}
              >
                Save Adjustment
              </ActionButton>
            </>
          }
        >
          <div className="grid gap-3">
            <SelectField
              label="Product"
              value={adjustment.productId}
              onChange={(value) => setAdjustment({ ...adjustment, productId: value, variantId: undefined })}
              options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.stock} on hand)` }))}
            />

            {selectedProduct?.variants && selectedProduct.variants.length > 0 && (
              <SelectField
                label="Variant"
                value={adjustment.variantId || ""}
                onChange={(value) => setAdjustment({ ...adjustment, variantId: value || undefined })}
                options={[
                  { value: "", label: "Select specific variant" },
                  ...selectedProduct.variants.map((v) => ({
                    value: v.id,
                    label: `${v.size ? `Size ${v.size}` : ""}${v.colorName ? ` · ${v.colorName}` : ""} (${v.stock} on hand)`,
                  })),
                ]}
              />
            )}

            <Field
              label="Quantity Adjustment (e.g. +5 to add, -2 to remove)"
              type="number"
              value={String(adjustment.delta)}
              onChange={(value) => setAdjustment({ ...adjustment, delta: Number(value) || 0 })}
            />

            <Field
              label="Reason / Note"
              value={adjustment.note}
              placeholder="e.g. Physical inventory recount, damaged piece write-off"
              onChange={(value) => setAdjustment({ ...adjustment, note: value })}
              textarea
            />
          </div>
        </Modal>
      )}

      {/* Barcode Sticker Printing Modal */}
      {printProduct && (
        <BarcodeStickerModal
          product={printProduct}
          isOpen={Boolean(printProduct)}
          onClose={() => setPrintProduct(null)}
        />
      )}
    </div>
  );
}
