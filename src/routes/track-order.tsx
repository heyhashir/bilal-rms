import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Circle, Package, Truck, Home } from "lucide-react";
import { useOrders, type Order } from "@/store/auth";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/track-order")({
  head: () => ({ meta: [{ title: "Track order — Bilal Garments" }] }),
  component: Track,
});

const STAGES: { key: Order["status"]; label: string; icon: typeof Package }[] = [
  { key: "pending", label: "Pending", icon: Circle },
  { key: "processing", label: "Processing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
];

function Track() {
  const orders = useOrders((s) => s.orders);
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const find = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const o = orders.find((x) => x.id.toLowerCase() === id.trim().toLowerCase() && x.email.toLowerCase() === email.trim().toLowerCase());
    if (!o) { setOrder(null); return setErr("No matching order. Double-check your order ID and email."); }
    setOrder(o);
  };

  const idx = order ? Math.max(0, STAGES.findIndex((s) => s.key === order.status)) : -1;

  return (
    <div className="container-bg py-12 md:py-16 max-w-3xl">
      <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Support</div>
      <h1 className="display text-4xl md:text-5xl mb-8">Track your order.</h1>

      <form onSubmit={find} className="grid md:grid-cols-[1fr_1fr_auto] gap-3 mb-10">
        <label className="block">
          <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Order ID</span>
          <input value={id} onChange={(e) => setId(e.target.value)} placeholder="BG-…" className="w-full border border-border bg-background px-3 py-3 text-sm outline-none focus:border-foreground" />
        </label>
        <label className="block">
          <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full border border-border bg-background px-3 py-3 text-sm outline-none focus:border-foreground" />
        </label>
        <button className="bg-primary text-primary-foreground px-6 text-xs uppercase tracking-widest md:self-end md:h-[46px]">Track</button>
      </form>

      {err && <div className="bg-secondary p-6 text-center text-sm text-muted-foreground">{err}</div>}
      {order && order.status === "cancelled" && (
        <div className="bg-sale text-primary-foreground p-6 text-sm">This order was cancelled.</div>
      )}

      {order && order.status !== "cancelled" && (
        <>
          <div className="border border-border p-6 mb-6">
            <div className="grid grid-cols-4 gap-2 md:gap-4">
              {STAGES.map((s, i) => {
                const active = i <= idx;
                const Icon = active ? CheckCircle2 : s.icon;
                return (
                  <div key={s.key} className="flex flex-col items-center gap-2 text-center">
                    <div className={`h-10 w-10 grid place-items-center rounded-full border ${active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className={`text-[10px] uppercase tracking-widest ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</div>
                  </div>
                );
              })}
            </div>
            <div className="relative mt-4 h-0.5 bg-border">
              <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${(idx / (STAGES.length - 1)) * 100}%` }} />
            </div>
          </div>

          <div className="border border-border p-6 text-sm space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground">Order</span><span className="font-semibold">{order.id}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Placed</span><span>{new Date(order.createdAt).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">{formatPrice(order.total)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Ship to</span><span>{order.shipping.address}, {order.shipping.city}</span></div>
          </div>
        </>
      )}

      <div className="mt-10 text-xs text-center">
        <Link to="/contact" className="underline underline-offset-4 text-muted-foreground">Need help? Contact support</Link>
      </div>
    </div>
  );
}
