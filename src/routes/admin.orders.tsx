import { createFileRoute } from "@tanstack/react-router";
import { useOrders, type Order } from "@/store/auth";
import { formatPrice } from "@/lib/format";
import { useState } from "react";
import { X } from "lucide-react";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

const statuses: Order["status"][] = ["pending", "processing", "shipped", "delivered", "cancelled"];

function AdminOrders() {
  const { orders, updateStatus } = useOrders();
  const [view, setView] = useState<Order | null>(null);

  return (
    <div>
      <h2 className="display text-2xl mb-5">Orders ({orders.length})</h2>
      {orders.length === 0 ? (
        <div className="bg-secondary p-10 text-center text-muted-foreground">No orders yet.</div>
      ) : (
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="text-left p-3">Order</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Total</th>
                <th className="text-left p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-3 font-semibold">{o.id}</td>
                  <td className="p-3">
                    <div>{o.customerName}</div>
                    <div className="text-xs text-muted-foreground">{o.email}</div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="p-3 font-semibold">{formatPrice(o.total)}</td>
                  <td className="p-3">
                    <select
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value as Order["status"])}
                      className="border border-border bg-background px-2 py-1 text-xs uppercase tracking-widest"
                    >
                      {statuses.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => setView(o)} className="text-xs uppercase tracking-widest underline">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view && (
        <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={() => setView(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-background w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Order</div>
                <div className="display text-xl">{view.id}</div>
              </div>
              <button onClick={() => setView(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Customer</div>
                <div>{view.customerName} · {view.email}</div>
                <div className="text-muted-foreground">{view.shipping.phone}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Ship to</div>
                <div>{view.shipping.address}, {view.shipping.city} {view.shipping.postal}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Items</div>
                {view.lines.map((l) => (
                  <div key={l.id} className="flex justify-between border-t border-border py-2">
                    <span>{l.name} <span className="text-muted-foreground">· {l.color}/{l.size} ×{l.qty}</span></span>
                    <span>{formatPrice(l.unitPrice * l.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-3 flex justify-between font-semibold">
                <span>Total</span><span>{formatPrice(view.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
