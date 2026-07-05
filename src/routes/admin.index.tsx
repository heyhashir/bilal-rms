import { createFileRoute, Link } from "@tanstack/react-router";
import { useCatalog } from "@/store/catalog";
import { useOrders } from "@/store/auth";
import { useRetail } from "@/store/retail";
import { formatPrice } from "@/lib/format";
import { StatCard, PageHeader, StatusPill, EmptyState } from "@/components/admin/primitives";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const products = useCatalog((s) => s.products);
  const orders = useOrders((s) => s.orders);
  const retail = useRetail();

  const revenue = orders.reduce((a, o) => a + o.total, 0);
  const pending = orders.filter((o) => o.status === "pending").length;
  const lowStock = products.filter((p) => p.stock <= 5).length;
  const openReturns = retail.returns.filter((r) => r.status === "requested" || r.status === "approved").length;
  const activePOs = retail.purchaseOrders.filter((p) => p.status === "ordered" || p.status === "draft").length;

  // last 7 days sales
  const now = Date.now();
  const day = 86400000;
  const buckets = Array.from({ length: 7 }).map((_, i) => {
    const start = now - (6 - i) * day;
    const label = new Date(start).toLocaleDateString("en-US", { weekday: "short" });
    const total = orders
      .filter((o) => o.createdAt >= start && o.createdAt < start + day)
      .reduce((a, o) => a + o.total, 0);
    return { label, total };
  });
  const maxBar = Math.max(1, ...buckets.map((b) => b.total));

  const topProducts = [...products]
    .map((p) => ({
      p,
      sold: orders.reduce((a, o) => a + o.lines.filter((l) => l.productId === p.id).reduce((x, l) => x + l.qty, 0), 0),
    }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title="Today at Bilal Garments."
        description="A single view of sales, stock and operations."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Revenue" value={formatPrice(revenue)} delta="+12%" tone="up" />
        <StatCard label="Orders" value={orders.length} />
        <StatCard label="Pending" value={pending} tone={pending > 0 ? "down" : "flat"} delta={pending > 0 ? "Action" : "OK"} />
        <StatCard label="Low stock" value={lowStock} tone={lowStock > 0 ? "down" : "flat"} delta={lowStock > 0 ? "Reorder" : "OK"} />
        <StatCard label="Open returns" value={openReturns} />
        <StatCard label="Open POs" value={activePOs} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 border border-border p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="display text-lg">Sales · last 7 days</h3>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">{formatPrice(buckets.reduce((a, b) => a + b.total, 0))}</span>
          </div>
          <div className="grid grid-cols-7 gap-2 h-40 items-end">
            {buckets.map((b, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-full bg-secondary relative h-full flex items-end">
                  <div
                    className="w-full bg-primary transition-all"
                    style={{ height: `${(b.total / maxBar) * 100}%` }}
                    title={formatPrice(b.total)}
                  />
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{b.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-border p-5">
          <h3 className="display text-lg mb-4">Alerts</h3>
          <div className="space-y-3">
            {retail.notifications.slice(0, 5).map((n) => (
              <div key={n.id} className="border-b border-border pb-3 last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{n.title}</span>
                  <StatusPill status={n.level} />
                </div>
                <p className="text-xs text-muted-foreground">{n.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-8">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="display text-lg">Recent orders</h3>
            <Link to="/admin/orders" className="text-xs uppercase tracking-widest underline">View all</Link>
          </div>
          {orders.length === 0 ? (
            <EmptyState title="No orders yet" hint="Orders from your storefront will appear here." />
          ) : (
            <div className="border border-border">
              {orders.slice(0, 6).map((o) => (
                <div key={o.id} className="flex items-center gap-3 p-3 border-b border-border last:border-0 text-sm">
                  <span className="font-semibold w-24 truncate">{o.id}</span>
                  <span className="flex-1 text-xs text-muted-foreground truncate">{o.customerName}</span>
                  <StatusPill status={o.status} />
                  <span className="font-semibold w-24 text-right">{formatPrice(o.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="display text-lg">Top products</h3>
            <Link to="/admin/reports" className="text-xs uppercase tracking-widest underline">Reports</Link>
          </div>
          <div className="border border-border">
            {topProducts.map(({ p, sold }) => (
              <div key={p.id} className="flex items-center gap-3 p-3 border-b border-border last:border-0 text-sm">
                <div className="w-10 h-12 bg-secondary overflow-hidden shrink-0">
                  <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{sold} sold · {p.stock} in stock</div>
                </div>
                <div className="font-semibold">{formatPrice(p.salePrice ?? p.price)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
