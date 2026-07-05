import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth, useOrders } from "@/store/auth";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "My account — Bilal Garments" }] }),
  component: Account,
});

function Account() {
  const auth = useAuth();
  const user = auth.users.find((u) => u.id === auth.currentId) ?? null;
  const orders = useOrders((s) => s.orders).filter((o) => o.userId === user?.id || o.email === user?.email);
  const nav = useNavigate();

  useEffect(() => {
    if (!user) nav({ to: "/login" });
  }, [user, nav]);

  if (!user) return null;

  return (
    <div className="container-bg py-12 md:py-16">
      <div className="flex items-end justify-between border-b border-border pb-6 mb-10">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Account</div>
          <h1 className="display text-4xl md:text-5xl">Hi, {user.name.split(" ")[0]}.</h1>
          <p className="text-sm text-muted-foreground mt-2">{user.email}</p>
        </div>
        <div className="flex gap-3">
          {user.role === "admin" && (
            <Link to="/admin" className="border border-foreground px-5 py-2.5 text-xs uppercase tracking-widest">Admin</Link>
          )}
          <button
            onClick={() => { auth.logout(); nav({ to: "/" }); }}
            className="border border-foreground px-5 py-2.5 text-xs uppercase tracking-widest"
          >
            Sign out
          </button>
        </div>
      </div>

      <h2 className="display text-2xl mb-5">Order history</h2>
      {orders.length === 0 ? (
        <div className="bg-secondary p-10 text-center">
          <p className="text-muted-foreground mb-4">You haven't placed any orders yet.</p>
          <Link to="/shop" className="inline-block bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-widest">Start shopping</Link>
        </div>
      ) : (
        <div className="border border-border">
          {orders.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center gap-4 p-4 border-b border-border last:border-b-0 text-sm">
              <div className="w-32">
                <div className="font-semibold">{o.id}</div>
                <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="flex-1 min-w-0 text-muted-foreground text-xs">
                {o.lines.length} item{o.lines.length > 1 ? "s" : ""} · {o.payment.toUpperCase()}
              </div>
              <span className={`text-[10px] uppercase tracking-widest px-2 py-1 ${
                o.status === "delivered" ? "bg-accent text-accent-foreground" :
                o.status === "cancelled" ? "bg-sale text-primary-foreground" :
                "bg-secondary"
              }`}>{o.status}</span>
              <div className="font-semibold">{formatPrice(o.total)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
