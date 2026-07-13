import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminOrdersApi } from "@/lib/admin-orders-api";
import type { ReturnRequest } from "@/lib/admin-types";
import { EmptyState, PageHeader, StatCard, StatusPill } from "@/components/admin/primitives";
import { formatPrice } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

export const Route = createFileRoute("/admin/refunds")({
  component: AdminRefunds,
});

function AdminRefunds() {
  const { data: returns = [] } = useQuery<ReturnRequest[]>({
    queryKey: queryKeys.admin.returns,
    queryFn: async () => (await adminOrdersApi.returns()).returns,
  });

  const refunded = useMemo(() => returns.filter((request) => request.status === "refunded"), [returns]);
  const total = refunded.reduce((sum, request) => sum + request.refundAmount, 0);
  const pending = returns.filter((request) => request.status === "approved").reduce((sum, request) => sum + request.refundAmount, 0);

  return (
    <div>
      <PageHeader eyebrow="Sales" title="Refunds" description="Financial view of all refunded return requests." />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Refunded" value={formatPrice(total)} />
        <StatCard label="Pending" value={formatPrice(pending)} tone={pending > 0 ? "down" : "flat"} />
        <StatCard label="Count" value={refunded.length} />
        <StatCard label="Average" value={refunded.length ? formatPrice(Math.round(total / refunded.length)) : formatPrice(0)} />
      </div>

      {refunded.length === 0 ? (
        <EmptyState title="No refunds issued" />
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="min-w-[600px] w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Return</th>
                <th className="p-3 text-left">Order</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {refunded.map((request) => (
                <tr key={request.id} className="border-t border-border">
                  <td className="p-3 text-xs text-muted-foreground">{new Date(request.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 font-semibold">{request.id}</td>
                  <td className="p-3 font-mono text-xs">{request.orderId}</td>
                  <td className="p-3 font-semibold">{formatPrice(request.refundAmount)}</td>
                  <td className="p-3"><StatusPill status={request.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
