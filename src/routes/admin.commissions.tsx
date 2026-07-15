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
  const entries = data?.commissions ?? [];
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
        else if (entry.status === "reversed") summary.reversed += entry.amount;
        else summary.earned += entry.amount;
        return summary;
      },
      { earned: 0, paid: 0, reversed: 0 },
    );
  }, [entries]);

  return (
    <div>
      <PageHeader
        eyebrow="Commission"
        title={`Commission ledger (${meta?.total ?? entries.length})`}
        description={`Earned ${formatPrice(totals.earned)} | Paid ${formatPrice(totals.paid)} | Reversed ${formatPrice(totals.reversed)}`}
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
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="p-3 text-left">Employee</th>
                <th className="p-3 text-left">Sale</th>
                <th className="p-3 text-left">Product</th>
                <th className="p-3 text-left">Rate</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t border-border">
                  <td className="p-3 font-medium">{entry.employeeName}</td>
                  <td className="p-3">
                    {entry.saleNumber}
                    <div className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</div>
                  </td>
                  <td className="p-3">{entry.productName}</td>
                  <td className="p-3">{entry.rate}%</td>
                  <td className="p-3 font-semibold">{formatPrice(entry.amount)}</td>
                  <td className="p-3">
                    <StatusPill status={entry.status} />
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end">
                      {entry.status !== "paid" && entry.amount > 0 && (
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
