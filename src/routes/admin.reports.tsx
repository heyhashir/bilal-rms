import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EmptyState, PageHeader, StatCard, Tabs } from "@/components/admin/primitives";
import { adminReportsApi } from "@/lib/admin-reports-api";
import { formatPrice } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

export const Route = createFileRoute("/admin/reports")({
  component: AdminReports,
});

const reportTabs = [
  { key: "overview", label: "Overview & P&L" },
  { key: "itemwise", label: "Item-Wise Sales & Returns" },
];

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function AdminReports() {
  const today = useMemo(() => getLocalDateString(), []);
  const [tab, setTab] = useState("overview");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const { data: summaryData, isLoading } = useQuery({
    queryKey: queryKeys.admin.reports({ from, to }),
    queryFn: async () => adminReportsApi.summary({ from: from || undefined, to: to || undefined }),
  });

  const summary = summaryData?.summary;

  const setDatePreset = (preset: "today" | "yesterday" | "this_week" | "this_month" | "all_time") => {
    const now = new Date();
    if (preset === "today") {
      const d = getLocalDateString(now);
      setFrom(d);
      setTo(d);
    } else if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const d = getLocalDateString(y);
      setFrom(d);
      setTo(d);
    } else if (preset === "this_week") {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      setFrom(getLocalDateString(start));
      setTo(getLocalDateString(now));
    } else if (preset === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setFrom(getLocalDateString(start));
      setTo(getLocalDateString(now));
    } else if (preset === "all_time") {
      setFrom("");
      setTo("");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Financial & Sales Reports"
        title="Revenue, profit & loss."
        description="Comprehensive store financial performance, online vs POS revenue, department profitability, and item-wise sales."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 border border-border bg-background p-1 text-xs">
              <button
                type="button"
                onClick={() => setDatePreset("today")}
                className="px-2 py-1 uppercase tracking-wider hover:bg-secondary"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("yesterday")}
                className="px-2 py-1 uppercase tracking-wider hover:bg-secondary"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("this_week")}
                className="px-2 py-1 uppercase tracking-wider hover:bg-secondary"
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("this_month")}
                className="px-2 py-1 uppercase tracking-wider hover:bg-secondary"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("all_time")}
                className="px-2 py-1 uppercase tracking-wider hover:bg-secondary"
              >
                All Time
              </button>
            </div>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="border border-border bg-background px-3 py-2 text-sm"
              title="From date"
            />
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="border border-border bg-background px-3 py-2 text-sm"
              title="To date"
            />
          </div>
        }
      />

      <Tabs items={reportTabs} active={tab} onChange={setTab} />

      {isLoading || !summary ? (
        <EmptyState title="Loading reports" hint="Calculating date-range totals from live cloud data." />
      ) : tab === "overview" ? (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
            <StatCard
              label="Online Revenue"
              value={formatPrice(summary.overview.onlineRevenue)}
              hint={`${summary.overview.onlineOrders} delivered · ${summary.overview.operationalOnlineOrders} operational`}
            />
            <StatCard label="POS Revenue" value={formatPrice(summary.overview.posRevenue)} hint={`${summary.overview.posSales} in-store bills`} />
            <StatCard label="POS Refunds" value={formatPrice(summary.overview.posRefundAmount)} tone="down" hint="Customer returns" />
            <StatCard label="Wholesale Purchases" value={formatPrice(summary.wholesale?.totalSpend ?? 0)} hint={`${summary.wholesale?.totalUnits ?? 0} pcs intake`} />
            <StatCard label="Gross Profit" value={formatPrice(summary.profit.total)} hint="Net earnings" />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="border border-border">
              <div className="border-b border-border p-4">
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Department Profitability</div>
                <div className="mt-1 text-xs text-muted-foreground">Gross profit by category across online orders and POS sales.</div>
              </div>
              {summary.profit.byCategory.length === 0 ? (
                <EmptyState title="No category sales in this range" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead className="bg-secondary text-xs uppercase tracking-widest">
                      <tr>
                        <th className="p-3 text-left">Department</th>
                        <th className="p-3 text-right">Gross Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.profit.byCategory.map((row) => (
                        <tr key={row.categorySlug} className="border-t border-border hover:bg-secondary/30">
                          <td className="p-3 font-medium uppercase">{row.categoryName}</td>
                          <td className="p-3 text-right font-mono font-semibold text-accent-foreground">{formatPrice(row.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="border border-border">
              <div className="border-b border-border p-4">
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Product Line Profitability</div>
                <div className="mt-1 text-xs text-muted-foreground">Top earning products across all sales channels.</div>
              </div>
              {summary.profit.byProduct.length === 0 ? (
                <EmptyState title="No product sales in this range" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead className="bg-secondary text-xs uppercase tracking-widest">
                      <tr>
                        <th className="p-3 text-left">Product</th>
                        <th className="p-3 text-left">Department</th>
                        <th className="p-3 text-right">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.profit.byProduct.map((row) => (
                        <tr key={row.productId} className="border-t border-border hover:bg-secondary/30">
                          <td className="p-3 font-medium">{row.productName}</td>
                          <td className="p-3 text-xs uppercase text-muted-foreground">{row.categoryName}</td>
                          <td className="p-3 text-right font-mono font-semibold text-accent-foreground">{formatPrice(row.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      ) : (
        /* Item-Wise Sales Tab */
        !summary.itemWiseSales || summary.itemWiseSales.length === 0 ? (
          <EmptyState title="No item-wise sales in this range" hint="Sales and returns for this range will appear here." />
        ) : (
          <div className="overflow-x-auto border border-border">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-widest">
                <tr>
                  <th className="p-3 text-left">Product</th>
                  <th className="p-3 text-left">Department</th>
                  <th className="p-3 text-right">Units Sold</th>
                  <th className="p-3 text-right">Units Refunded</th>
                  <th className="p-3 text-right">Net Units</th>
                  <th className="p-3 text-right">Net Revenue</th>
                  <th className="p-3 text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {summary.itemWiseSales.map((row) => (
                  <tr key={row.productId} className="border-t border-border hover:bg-secondary/30 transition-colors">
                    <td className="p-3 font-medium">{row.productName}</td>
                    <td className="p-3 text-xs uppercase text-muted-foreground">{row.categoryName}</td>
                    <td className="p-3 text-right font-semibold">{row.unitsSold}</td>
                    <td className={`p-3 text-right font-semibold ${row.unitsRefunded > 0 ? "text-sale" : ""}`}>{row.unitsRefunded}</td>
                    <td className="p-3 text-right font-bold">{row.netUnits}</td>
                    <td className="p-3 text-right font-mono font-medium">{formatPrice(row.netRevenue)}</td>
                    <td className="p-3 text-right font-mono font-bold text-accent-foreground">{formatPrice(row.netProfit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
