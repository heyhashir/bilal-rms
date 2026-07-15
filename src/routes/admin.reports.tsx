import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EmptyState, PageHeader, StatCard } from "@/components/admin/primitives";
import { adminReportsApi } from "@/lib/admin-reports-api";
import { formatPrice } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

export const Route = createFileRoute("/admin/reports")({
  component: AdminReports,
});

function AdminReports() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.admin.reports({ from, to }),
    queryFn: async () => adminReportsApi.summary({ from, to }),
  });

  const summary = data?.summary;

  return (
    <div>
      <PageHeader
        eyebrow="Reports"
        title="Range reporting."
        description="Cloud-authoritative revenue, refunds, and commission summaries for the selected date range."
        action={
          <div className="flex flex-wrap gap-2">
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="border border-border bg-background px-3 py-2 text-sm" />
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="border border-border bg-background px-3 py-2 text-sm" />
          </div>
        }
      />

      {isLoading || !summary ? (
        <EmptyState title="Loading reports" hint="Calculating date-range totals from live cloud data." />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatCard label="Online revenue" value={formatPrice(summary.overview.onlineRevenue)} />
            <StatCard label="POS revenue" value={formatPrice(summary.overview.posRevenue)} />
            <StatCard label="POS refunds" value={formatPrice(summary.overview.posRefundAmount)} />
            <StatCard label="Online orders" value={summary.overview.onlineOrders} />
            <StatCard label="POS sales" value={summary.overview.posSales} />
          </div>

          <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Commission earned" value={formatPrice(summary.commissions.earned)} />
            <StatCard label="Commission reversed" value={formatPrice(summary.commissions.reversed)} />
            <StatCard label="Commission paid" value={formatPrice(summary.commissions.paid)} />
            <StatCard label="Commission payable" value={formatPrice(summary.commissions.payable)} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="border border-border">
              <div className="border-b border-border p-4">
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Employees</div>
                <div className="mt-2 text-sm text-muted-foreground">Daily and range commission reconciliation by employee.</div>
              </div>
              {summary.employees.length === 0 ? (
                <EmptyState title="No employee commission in this range" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-secondary text-xs uppercase tracking-widest">
                      <tr>
                        <th className="p-3 text-left">Employee</th>
                        <th className="p-3 text-left">Earned</th>
                        <th className="p-3 text-left">Reversed</th>
                        <th className="p-3 text-left">Paid</th>
                        <th className="p-3 text-left">Payable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.employees.map((entry) => (
                        <tr key={entry.employeeId} className="border-t border-border">
                          <td className="p-3 font-medium">{entry.employeeName}</td>
                          <td className="p-3">{formatPrice(entry.earned)}</td>
                          <td className="p-3">{formatPrice(entry.reversed)}</td>
                          <td className="p-3">{formatPrice(entry.paid)}</td>
                          <td className="p-3 font-semibold">{formatPrice(entry.payable)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="border border-border">
              <div className="border-b border-border p-4">
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Products</div>
                <div className="mt-2 text-sm text-muted-foreground">Commission contribution by product for the selected range.</div>
              </div>
              {summary.products.length === 0 ? (
                <EmptyState title="No product commission in this range" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-secondary text-xs uppercase tracking-widest">
                      <tr>
                        <th className="p-3 text-left">Product</th>
                        <th className="p-3 text-left">Earned</th>
                        <th className="p-3 text-left">Reversed</th>
                        <th className="p-3 text-left">Paid</th>
                        <th className="p-3 text-left">Payable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.products.map((entry) => (
                        <tr key={entry.productId} className="border-t border-border">
                          <td className="p-3 font-medium">{entry.productName}</td>
                          <td className="p-3">{formatPrice(entry.earned)}</td>
                          <td className="p-3">{formatPrice(entry.reversed)}</td>
                          <td className="p-3">{formatPrice(entry.paid)}</td>
                          <td className="p-3 font-semibold">{formatPrice(entry.payable)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
