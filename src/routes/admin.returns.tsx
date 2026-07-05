import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useRetail, type ReturnItem } from "@/store/retail";
import { PageHeader, Toolbar, StatusPill, ActionButton, EmptyState, SelectField } from "@/components/admin/primitives";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/returns")({
  component: AdminReturns,
});

function AdminReturns() {
  const { returns, setReturnStatus, logMovement } = useRetail();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = returns.filter((r) =>
    (status === "all" || r.status === status) &&
    `${r.id} ${r.orderId} ${r.productName}`.toLowerCase().includes(q.toLowerCase())
  );

  const approve = (r: ReturnItem) => {
    setReturnStatus(r.id, "approved");
    toast.success("Return approved");
  };
  const refund = (r: ReturnItem) => {
    setReturnStatus(r.id, "refunded");
    logMovement({ productId: r.productId, productName: r.productName, qty: r.condition === "resellable" ? r.qty : 0, reason: "return", reference: r.id, note: `Refunded ${formatPrice(r.refundAmount)}`, createdBy: "Support" });
    toast.success("Refund issued");
  };

  return (
    <div>
      <PageHeader eyebrow="Sales" title={`Returns (${returns.length})`} description="Track, approve and refund customer returns." />
      <Toolbar
        search={q}
        onSearch={setQ}
        right={
          <SelectField label="" value={status} onChange={setStatus} options={[
            { value: "all", label: "All" },
            { value: "requested", label: "Requested" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
            { value: "refunded", label: "Refunded" },
          ]} />
        }
      />
      {filtered.length === 0 ? (
        <EmptyState title="No returns yet" />
      ) : (
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="text-left p-3">Return #</th>
                <th className="text-left p-3">Order</th>
                <th className="text-left p-3">Product</th>
                <th className="text-left p-3">Reason</th>
                <th className="text-left p-3">Condition</th>
                <th className="text-left p-3">Refund</th>
                <th className="text-left p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 font-semibold">{r.id}</td>
                  <td className="p-3 font-mono text-xs">{r.orderId}</td>
                  <td className="p-3">{r.productName} × {r.qty}</td>
                  <td className="p-3 text-muted-foreground">{r.reason}</td>
                  <td className="p-3 capitalize">{r.condition}</td>
                  <td className="p-3 font-semibold">{formatPrice(r.refundAmount)}</td>
                  <td className="p-3"><StatusPill status={r.status} /></td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {r.status === "requested" && (
                      <>
                        <button onClick={() => approve(r)} className="text-xs uppercase tracking-widest underline mr-3">Approve</button>
                        <button onClick={() => setReturnStatus(r.id, "rejected")} className="text-xs uppercase tracking-widest underline text-sale">Reject</button>
                      </>
                    )}
                    {r.status === "approved" && (
                      <ActionButton onClick={() => refund(r)}>Refund</ActionButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
