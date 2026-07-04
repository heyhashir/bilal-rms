import { createFileRoute } from "@tanstack/react-router";
import { useRetail } from "@/store/retail";
import { PageHeader, StatCard, EmptyState, StatusPill } from "@/components/admin/primitives";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/admin/refunds")({
  component: AdminRefunds,
});

function AdminRefunds() {
  const returns = useRetail((s) => s.returns);
  const refunded = returns.filter((r) => r.status === "refunded");
  const total = refunded.reduce((a, r) => a + r.refundAmount, 0);
  const pending = returns.filter((r) => r.status === "approved").reduce((a, r) => a + r.refundAmount, 0);

  return (
    <div>
      <PageHeader eyebrow="Sales" title="Refunds" description="Financial view of all returns pushed to refund." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Refunded" value={formatPrice(total)} />
        <StatCard label="Pending" value={formatPrice(pending)} tone={pending > 0 ? "down" : "flat"} />
        <StatCard label="Count" value={refunded.length} />
        <StatCard label="Average" value={refunded.length ? formatPrice(Math.round(total / refunded.length)) : formatPrice(0)} />
      </div>

      {refunded.length === 0 ? (
        <EmptyState title="No refunds issued" />
      ) : (
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Return</th>
                <th className="text-left p-3">Order</th>
                <th className="text-left p-3">Amount</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {refunded.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 font-semibold">{r.id}</td>
                  <td className="p-3 font-mono text-xs">{r.orderId}</td>
                  <td className="p-3 font-semibold">{formatPrice(r.refundAmount)}</td>
                  <td className="p-3"><StatusPill status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
