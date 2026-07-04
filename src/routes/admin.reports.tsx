import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useOrders, useAuth } from "@/store/auth";
import { useCatalog } from "@/store/catalog";
import { PageHeader, StatCard, Tabs, EmptyState } from "@/components/admin/primitives";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/admin/reports")({
  component: AdminReports,
});

const TABS = [
  { key: "sales", label: "Sales" },
  { key: "profit", label: "Profit" },
  { key: "inventory", label: "Inventory" },
  { key: "customers", label: "Customers" },
  { key: "top", label: "Top selling" },
];

function AdminReports() {
  const orders = useOrders((s) => s.orders);
  const products = useCatalog((s) => s.products);
  const users = useAuth((s) => s.users);
  const [tab, setTab] = useState("sales");

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      const k = new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      map.set(k, (map.get(k) ?? 0) + o.total);
    });
    return Array.from(map.entries());
  }, [orders]);

  const revenue = orders.reduce((a, o) => a + o.total, 0);
  const avgOrder = orders.length ? revenue / orders.length : 0;
  const cogs = orders.reduce((a, o) => a + o.lines.reduce((x, l) => x + l.unitPrice * 0.6 * l.qty, 0), 0);
  const profit = revenue - cogs;
  const inventoryValue = products.reduce((a, p) => a + p.stock * (p.salePrice ?? p.price), 0);

  const topProducts = [...products]
    .map((p) => {
      const sold = orders.reduce((a, o) => a + o.lines.filter((l) => l.productId === p.id).reduce((x, l) => x + l.qty, 0), 0);
      const rev = orders.reduce((a, o) => a + o.lines.filter((l) => l.productId === p.id).reduce((x, l) => x + l.qty * l.unitPrice, 0), 0);
      return { p, sold, rev };
    })
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 10);

  const topCustomers = [...users]
    .filter((u) => u.role === "customer")
    .map((u) => {
      const mine = orders.filter((o) => o.userId === u.id || o.email === u.email);
      return { u, orders: mine.length, spend: mine.reduce((a, o) => a + o.total, 0) };
    })
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10);

  return (
    <div>
      <PageHeader eyebrow="Insights" title="Reports" description="Snapshots across sales, profit, stock and customers." />
      <Tabs items={TABS} active={tab} onChange={setTab} />

      {tab === "sales" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard label="Revenue" value={formatPrice(revenue)} />
            <StatCard label="Orders" value={orders.length} />
            <StatCard label="Avg. order" value={formatPrice(Math.round(avgOrder))} />
            <StatCard label="Refunds" value={formatPrice(0)} />
          </div>
          <MonthlyChart data={monthly} label="Monthly revenue" />
        </>
      )}

      {tab === "profit" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard label="Revenue" value={formatPrice(revenue)} />
            <StatCard label="Est. COGS" value={formatPrice(Math.round(cogs))} />
            <StatCard label="Gross profit" value={formatPrice(Math.round(profit))} tone="up" delta={revenue ? `${Math.round((profit / revenue) * 100)}% margin` : undefined} />
            <StatCard label="Avg. margin" value={revenue ? `${Math.round((profit / revenue) * 100)}%` : "—"} />
          </div>
          <p className="text-sm text-muted-foreground">Profit calculations use an estimated 60% cost-of-goods ratio. Wire real cost prices per product to refine this figure.</p>
        </>
      )}

      {tab === "inventory" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard label="Inventory value" value={formatPrice(Math.round(inventoryValue))} />
            <StatCard label="SKUs" value={products.length} />
            <StatCard label="Units on hand" value={products.reduce((a, p) => a + p.stock, 0)} />
            <StatCard label="Out of stock" value={products.filter((p) => p.stock === 0).length} />
          </div>
          <div className="border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-widest">
                <tr>
                  <th className="text-left p-3">Product</th>
                  <th className="text-left p-3">Stock</th>
                  <th className="text-left p-3">Unit price</th>
                  <th className="text-left p-3">Value</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3">{p.name}</td>
                    <td className="p-3">{p.stock}</td>
                    <td className="p-3">{formatPrice(p.salePrice ?? p.price)}</td>
                    <td className="p-3 font-semibold">{formatPrice(p.stock * (p.salePrice ?? p.price))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "customers" && (
        topCustomers.length === 0 ? <EmptyState title="No customer data yet" /> : (
          <div className="border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-widest">
                <tr>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-left p-3">Orders</th>
                  <th className="text-left p-3">Total spend</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map(({ u, orders: n, spend }) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="p-3">{u.name}<div className="text-xs text-muted-foreground">{u.email}</div></td>
                    <td className="p-3">{n}</td>
                    <td className="p-3 font-semibold">{formatPrice(spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === "top" && (
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="text-left p-3">#</th>
                <th className="text-left p-3">Product</th>
                <th className="text-left p-3">Units sold</th>
                <th className="text-left p-3">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map(({ p, sold, rev }, i) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3 text-muted-foreground">{i + 1}</td>
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{sold}</td>
                  <td className="p-3 font-semibold">{formatPrice(rev)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MonthlyChart({ data, label }: { data: [string, number][]; label: string }) {
  if (data.length === 0) return <EmptyState title="No data yet" hint="Reports populate as orders come in." />;
  const max = Math.max(...data.map(([, v]) => v));
  return (
    <div className="border border-border p-5">
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">{label}</div>
      <div className="flex items-end gap-2 h-48">
        {data.map(([k, v]) => (
          <div key={k} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full bg-secondary relative h-full flex items-end">
              <div className="w-full bg-primary" style={{ height: `${(v / max) * 100}%` }} title={formatPrice(v)} />
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
