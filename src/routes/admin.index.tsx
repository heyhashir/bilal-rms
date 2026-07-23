import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminDashboardApi } from "@/lib/admin-dashboard-api";
import type { DashboardStats } from "@/lib/admin-types";
import { formatPrice } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { EmptyState, PageHeader, StatCard } from "@/components/admin/primitives";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const [panel, setPanel] = useState<"revenue" | "stock" | "employees">("revenue");
  const { data: stats } = useQuery<DashboardStats | null>({
    queryKey: queryKeys.admin.dashboard,
    queryFn: async () => (await adminDashboardApi.dashboard()).dashboard,
  });

  if (!stats) {
    return <EmptyState title="Loading dashboard" hint="Fetching live store metrics." />;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title="Today at BALY by Bilal Garments EST 2001."
        description="A live view of sales, stock, commission, and customer operations."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <button type="button" onClick={() => setPanel("revenue")} className="text-left">
          <StatCard label="Revenue" value={formatPrice(stats.revenue)} />
        </button>
        <StatCard label="POS revenue" value={formatPrice(stats.posRevenue)} />
        <StatCard label="Orders" value={stats.orders} />
        <StatCard label="POS sales" value={stats.posSales} />
        <button type="button" onClick={() => setPanel("stock")} className="text-left">
          <StatCard label="Low stock" value={stats.lowStock} tone={stats.lowStock > 0 ? "down" : "flat"} />
        </button>
        <StatCard label="Pending orders" value={stats.pendingOrders} tone={stats.pendingOrders > 0 ? "down" : "flat"} />
        <StatCard label="Returns" value={stats.returns} />
        <button type="button" onClick={() => setPanel("employees")} className="text-left">
          <StatCard label="Commission due" value={formatPrice(stats.pendingCommission)} />
        </button>
        <button type="button" onClick={() => setPanel("employees")} className="text-left">
          <StatCard label="Employees" value={stats.employees} />
        </button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="border border-border p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap gap-2 text-xs uppercase tracking-widest">
            <button onClick={() => setPanel("revenue")} className={panel === "revenue" ? "border-b border-foreground pb-1" : "text-muted-foreground"}>Revenue</button>
            <button onClick={() => setPanel("stock")} className={panel === "stock" ? "border-b border-foreground pb-1" : "text-muted-foreground"}>Low stock</button>
            <button onClick={() => setPanel("employees")} className={panel === "employees" ? "border-b border-foreground pb-1" : "text-muted-foreground"}>Employees</button>
          </div>

          {panel === "revenue" && (
            <div className="space-y-3">
              <h3 className="display text-lg">Latest revenue activity</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="bg-secondary text-xs uppercase tracking-widest">
                    <tr>
                      <th className="p-3 text-left">Source</th>
                      <th className="p-3 text-left">Number</th>
                      <th className="p-3 text-left">Customer</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.revenueRows.map((row) => (
                      <tr key={`${row.source}-${row.number}`} className="border-t border-border">
                        <td className="p-3 uppercase">{row.source}</td>
                        <td className="p-3">{row.number}</td>
                        <td className="p-3">{row.customerName || "Walk-in customer"}</td>
                        <td className="p-3 capitalize">{row.status}</td>
                        <td className="p-3 font-medium">{formatPrice(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {panel === "stock" && (
            <div className="space-y-3">
              <h3 className="display text-lg">Low stock products</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-secondary text-xs uppercase tracking-widest">
                    <tr>
                      <th className="p-3 text-left">Product</th>
                      <th className="p-3 text-left">Category</th>
                      <th className="p-3 text-left">Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.lowStockItems.map((item) => (
                      <tr key={item.productId} className="border-t border-border">
                        <td className="p-3 font-medium">{item.name}</td>
                        <td className="p-3">{item.categoryName}</td>
                        <td className="p-3">{item.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {panel === "employees" && (
            <div className="space-y-3">
              <h3 className="display text-lg">Employee commission overview</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-secondary text-xs uppercase tracking-widest">
                    <tr>
                      <th className="p-3 text-left">Employee</th>
                      <th className="p-3 text-left">Commission %</th>
                      <th className="p-3 text-left">Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.employeeCommissionRows.map((row) => (
                      <tr key={row.employeeId} className="border-t border-border">
                        <td className="p-3 font-medium">{row.name}</td>
                        <td className="p-3">{row.commissionRate}%</td>
                        <td className="p-3">{formatPrice(row.pendingCommission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="border border-border p-5">
          <h3 className="display mb-3 text-lg">Shortcuts</h3>
          <div className="space-y-2 text-sm">
            <Link to="/admin/products" className="block underline underline-offset-4">Manage products</Link>
            <Link to="/pos" className="block underline underline-offset-4">Open POS terminal</Link>
            <Link to="/admin/pos-sales" className="block underline underline-offset-4">Review POS sales</Link>
            <Link to="/admin/orders" className="block underline underline-offset-4">Review online orders</Link>
            <Link to="/admin/settings" className="block underline underline-offset-4">Update store settings</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
