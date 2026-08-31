import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import { ActionButton, EmptyState, PageHeader, QueryErrorState, StatCard, Toolbar } from "@/components/admin/primitives";
import { adminInventoryApi } from "@/lib/admin-inventory-api";
import { adminCatalogApi } from "@/lib/admin-catalog-api";
import { formatPrice } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

export const Route = createFileRoute("/admin/inventory-valuation")({
  component: AdminInventoryValuation,
});

function AdminInventoryValuation() {
  const [query, setQuery] = useState("");
  const [valCategory, setValCategory] = useState("");
  const [valBrand, setValBrand] = useState("");
  const [valInStockOnly, setValInStockOnly] = useState(true);

  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.admin.categories,
    queryFn: async () => (await adminCatalogApi.categories()).categories,
  });
  const { data: brands = [] } = useQuery({
    queryKey: queryKeys.admin.brands,
    queryFn: async () => (await adminCatalogApi.brands()).brands,
  });

  const {
    data: valuationData,
    isLoading: isValuationLoading,
    isError: isValuationError,
    refetch: refetchValuation,
  } = useQuery({
    queryKey: queryKeys.admin.inventoryValuation({ categoryId: valCategory, brandId: valBrand, inStockOnly: valInStockOnly, query }),
    queryFn: async () =>
      adminInventoryApi.inventoryValuation({
        categoryId: valCategory || undefined,
        brandId: valBrand || undefined,
        inStockOnly: valInStockOnly,
        query: query || undefined,
      }),
  });

  const valuationGroups = valuationData?.groups ?? [];
  const valuationSummary = valuationData?.summary;

  return (
    <div>
      <PageHeader
        eyebrow="Financial Inventory"
        title="Inventory valuation report."
        description="Department-wise stock evaluation with weighted average unit cost, total on-hand pieces, and extended wholesale cost vs retail potential."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton
              variant="ghost"
              onClick={() =>
                window.open(
                  adminInventoryApi.exportValuationUrl({
                    categoryId: valCategory || undefined,
                    brandId: valBrand || undefined,
                    inStockOnly: valInStockOnly,
                    query: query || undefined,
                  }),
                  "_blank",
                )
              }
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
            </ActionButton>
            <ActionButton variant="ghost" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5 mr-1" /> Print Valuation Sheet
            </ActionButton>
          </div>
        }
      />

      {/* Summary Stat Cards */}
      {valuationSummary && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard
            label="Total On-Hand Pieces"
            value={`${valuationSummary.totalUnits} pcs`}
            hint={`Across ${valuationSummary.totalProducts} products`}
          />
          <StatCard
            label="Total Cost Valuation"
            value={formatPrice(valuationSummary.totalCost)}
            hint="Wholesale capital tied in stock"
          />
          <StatCard
            label="Total Retail Potential"
            value={formatPrice(valuationSummary.totalRetail)}
            hint="Gross expected revenue"
          />
          <StatCard
            label="Average Unit Cost"
            value={formatPrice(valuationSummary.averageUnitCost)}
            hint="Weighted average per piece"
          />
          <StatCard
            label="Projected Margin"
            value={`${valuationSummary.projectedMarginPercent}%`}
            hint={`Profit ${formatPrice(valuationSummary.projectedProfit)}`}
          />
        </div>
      )}

      {/* 4-Way Filter Toolbar */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">Department</label>
          <select
            value={valCategory}
            onChange={(e) => setValCategory(e.target.value)}
            className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          >
            <option value="">All Departments</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">Brand</label>
          <select
            value={valBrand}
            onChange={(e) => setValBrand(e.target.value)}
            className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">Stock Filter</label>
          <select
            value={valInStockOnly ? "in_stock" : "all"}
            onChange={(e) => setValInStockOnly(e.target.value === "in_stock")}
            className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          >
            <option value="in_stock">In Stock Only (Qty &gt; 0)</option>
            <option value="all">All Products (Including 0 Stock)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">Search Products</label>
          <input
            type="text"
            placeholder="Search by name, SKU, slug..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
      </div>

      {/* Main Grouped Valuation Table */}
      {isValuationError ? (
        <QueryErrorState title="Inventory valuation could not be calculated" onRetry={() => void refetchValuation()} />
      ) : isValuationLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Calculating inventory valuation...</div>
      ) : valuationGroups.length === 0 ? (
        <EmptyState title="No items found" hint="Try clearing or adjusting your department or brand filters." />
      ) : (
        <div className="print-valuation-sheet">
          <div className="hidden print:block mb-6 border-b border-black pb-4">
            <div className="text-xl font-bold">BALY by Bilal Garments EST 2001.</div>
            <div className="text-sm font-semibold mt-1">Inventory Valuation & Evaluation Report</div>
            <div className="text-xs text-muted-foreground mt-1">
              As of: {valuationData?.asOfDate ? new Date(valuationData.asOfDate).toLocaleString() : new Date().toLocaleString()} | Total Units: {valuationSummary?.totalUnits} | Total Valuation: {formatPrice(valuationSummary?.totalCost ?? 0)}
            </div>
          </div>

          <div className="overflow-x-auto border border-border">
            <table className="w-full min-w-[840px] text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-widest">
                <tr>
                  <th className="p-3 text-left">Item Description</th>
                  <th className="p-3 text-left">Department</th>
                  <th className="p-3 text-right">On Hand Qty</th>
                  <th className="p-3 text-right">Avg Unit Cost</th>
                  <th className="p-3 text-right">Unit Retail</th>
                  <th className="p-3 text-right">Extended Cost</th>
                </tr>
              </thead>
              <tbody>
                {valuationGroups.map((group) => (
                  <Fragment key={group.categorySlug}>
                    <tr className="bg-secondary/60 border-t-2 border-border font-semibold text-xs uppercase tracking-wider">
                      <td colSpan={2} className="p-3">
                        Department: {group.deptName} ({group.items.length} items)
                      </td>
                      <td className="p-3 text-right font-mono">{group.totalUnits} pcs</td>
                      <td className="p-3 text-right font-mono">{formatPrice(group.averageCost)}</td>
                      <td className="p-3 text-right font-mono">{formatPrice(group.totalRetail)}</td>
                      <td className="p-3 text-right font-mono text-accent-foreground font-bold">{formatPrice(group.totalCost)}</td>
                    </tr>

                    {group.items.map((item) => (
                      <tr key={item.id} className="border-t border-border hover:bg-secondary/30 transition-colors">
                        <td className="p-3 pl-6">
                          <div className="font-medium">{item.productName}</div>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            {item.size && <span>Size {item.size}</span>}
                            {item.colorName && <span>· {item.colorName}</span>}
                            {item.barcode && <span className="font-mono text-[11px]">{item.barcode}</span>}
                            {item.brandName && <span>· {item.brandName}</span>}
                          </div>
                        </td>
                        <td className="p-3 text-xs uppercase text-muted-foreground">{item.deptName}</td>
                        <td className="p-3 text-right font-semibold">{item.stock}</td>
                        <td className="p-3 text-right font-mono text-muted-foreground">{formatPrice(item.costPrice)}</td>
                        <td className="p-3 text-right font-mono">{formatPrice(item.retailPrice)}</td>
                        <td className="p-3 text-right font-mono font-semibold">{formatPrice(item.extCost)}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>

              {/* Grand Total Footer */}
              {valuationSummary && (
                <tfoot className="border-t-2 border-foreground bg-accent text-accent-foreground font-bold text-sm">
                  <tr>
                    <td colSpan={2} className="p-4 text-left uppercase tracking-wider">
                      Grand Total ({valuationSummary.totalItems} Items)
                    </td>
                    <td className="p-4 text-right font-mono">{valuationSummary.totalUnits} pcs</td>
                    <td className="p-4 text-right font-mono">{formatPrice(valuationSummary.averageUnitCost)}</td>
                    <td className="p-4 text-right font-mono">{formatPrice(valuationSummary.totalRetail)}</td>
                    <td className="p-4 text-right font-mono text-base">{formatPrice(valuationSummary.totalCost)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
