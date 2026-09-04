import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { adminCommissionsApi } from "@/lib/admin-commissions-api";
import type { CommissionEntry } from "@/lib/admin-types";
import { formatPrice } from "@/lib/format";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { ActionButton, EmptyState, PageHeader, Pagination, StatusPill, Toolbar } from "@/components/admin/primitives";

export const Route = createFileRoute("/admin/commissions")({
  component: AdminCommissions,
});

function AdminCommissions() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const { data } = useQuery({
    queryKey: queryKeys.admin.commissionsList({ page, query }),
    queryFn: async () => adminCommissionsApi.commissions({ page, pageSize: 20, query }),
  });
  const entries = useMemo(() => data?.commissions ?? [], [data?.commissions]);
  const meta = data?.meta;

  const markPaid = useMutation({
    mutationFn: async (entry: CommissionEntry) => adminCommissionsApi.updateCommission(entry.id, { status: "paid" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.commissions });
      toast.success("Commission marked paid");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to update commission"));
    },
  });

  const totals = useMemo(() => {
    return entries.reduce(
      (summary, entry) => {
        if (entry.status === "paid") summary.paid += entry.amount;
        else {
          summary.cancelled += entry.cancelledAmount;
          summary.earned += Math.max(0, entry.amount - entry.cancelledAmount);
        }
        return summary;
      },
      { earned: 0, paid: 0, cancelled: 0 },
    );
  }, [entries]);

  return (
    <div>
      <PageHeader
        eyebrow="Commission"
        title={`Commission ledger (${meta?.total ?? entries.length})`}
        description={`Payable ${formatPrice(totals.earned)} | Paid ${formatPrice(totals.paid)} | Cancelled ${formatPrice(totals.cancelled)}`}
        action={
          <ActionButton variant="ghost" onClick={() => window.open(adminCommissionsApi.exportUrl({ query }), "_blank")}>
            Export CSV
          </ActionButton>
        }
      />
      <Toolbar
        search={query}
        onSearch={(value) => {
          setQuery(value);
          setPage(1);
        }}
      />
      {entries.length === 0 ? (
        <EmptyState title="No commission entries yet" hint="POS sales with salesperson attribution create entries here." />
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Employee</th>
                <th className="p-3 text-left">Sale</th>
                <th className="p-3 text-left">Product</th>
                <th className="p-3 text-left">Cost</th>
                <th className="p-3 text-left">Rate</th>
                <th className="p-3 text-left">Commission</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t border-border">
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                    <div>{new Date(entry.createdAt).toLocaleDateString()}</div>
                    <div className="text-[10px]">{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="p-3 font-medium">{entry.employeeName}</td>
                  <td className="p-3">
                    <span className="font-mono text-xs">{entry.saleNumber}</span>
                  </td>
                  <td className="p-3">
                    <div>{entry.productName}</div>
                    <div className="text-xs text-muted-foreground">Qty: {entry.qty}{entry.refundedQty > 0 ? ` (${entry.refundedQty} refunded)` : ""}</div>
                  </td>
                  <td className="p-3 font-medium text-muted-foreground">
                    {typeof entry.cost === "number" && entry.cost > 0
                      ? formatPrice(entry.cost)
                      : typeof entry.unitCost === "number" && entry.unitCost > 0
                        ? formatPrice(entry.unitCost * Math.max(1, entry.qty - entry.refundedQty))
                        : "—"}
                  </td>
                  <td className="p-3">{entry.rate}%</td>
                  <td className="p-3 font-semibold">
                    {formatPrice(Math.max(0, entry.amount - entry.cancelledAmount))}
                    {entry.cancelledAmount > 0 && <div className="text-xs font-normal text-muted-foreground">Cancelled {formatPrice(entry.cancelledAmount)}</div>}
                  </td>
                  <td className="p-3">
                    <StatusPill status={entry.status} />
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end">
                      {entry.status === "earned" && entry.amount - entry.cancelledAmount > 0 && (
                        <ActionButton variant="ghost" onClick={() => markPaid.mutate(entry)}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Mark paid
                        </ActionButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={meta?.page ?? page} pages={meta?.pages ?? 1} onChange={setPage} />
    </div>
  );
}
