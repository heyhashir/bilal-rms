import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { adminOrdersApi } from "@/lib/admin-orders-api";
import type { ReturnRequest } from "@/lib/admin-types";
import { formatPrice } from "@/lib/format";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { ActionButton, EmptyState, PageHeader, SelectField, StatusPill, Toolbar } from "@/components/admin/primitives";

export const Route = createFileRoute("/admin/returns")({
  component: AdminReturns,
});

function AdminReturns() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const { data: returns = [] } = useQuery({
    queryKey: queryKeys.admin.returns,
    queryFn: async () => (await adminOrdersApi.returns()).returns,
  });
  const updateReturnMutation = useMutation({
    mutationFn: ({ request, nextStatus }: { request: ReturnRequest; nextStatus: string }) =>
      adminOrdersApi.updateReturn(request.id, {
        status: nextStatus,
        refundAmount: nextStatus === "refunded" ? request.refundAmount : request.refundAmount || null,
        note: request.note,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.returns });
      toast.success("Return updated");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to update return"));
    },
  });

  const filtered = useMemo(
    () =>
      returns.filter((request) =>
        (status === "all" || request.status === status) &&
        `${request.id} ${request.orderId} ${request.reason}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, returns, status],
  );

  const updateReturn = async (request: ReturnRequest, nextStatus: string) => {
    updateReturnMutation.mutate({ request, nextStatus });
  };

  return (
    <div>
      <PageHeader eyebrow="Sales" title={`Returns (${returns.length})`} description="Track, approve and refund customer returns." />
      <Toolbar
        search={query}
        onSearch={setQuery}
        right={
          <SelectField
            label=""
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All" },
              { value: "requested", label: "Requested" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
              { value: "refunded", label: "Refunded" },
            ]}
          />
        }
      />
      {filtered.length === 0 ? (
        <EmptyState title="No returns yet" />
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="p-3 text-left">Return #</th>
                <th className="p-3 text-left">Order</th>
                <th className="p-3 text-left">Reason</th>
                <th className="p-3 text-left">Details</th>
                <th className="p-3 text-left">Refund</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((request) => (
                <tr key={request.id} className="border-t border-border">
                  <td className="p-3 font-semibold">{request.id}</td>
                  <td className="p-3 font-mono text-xs">{request.orderId}</td>
                  <td className="p-3">{request.reason}</td>
                  <td className="p-3 text-muted-foreground">{request.details || "-"}</td>
                  <td className="p-3 font-semibold">{formatPrice(request.refundAmount)}</td>
                  <td className="p-3"><StatusPill status={request.status} /></td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {request.status === "requested" && (
                      <>
                        <button onClick={() => void updateReturn(request, "approved")} className="mr-3 text-xs uppercase tracking-widest underline">Approve</button>
                        <button onClick={() => void updateReturn(request, "rejected")} className="text-xs uppercase tracking-widest underline text-sale">Reject</button>
                      </>
                    )}
                    {request.status === "approved" && (
                      <ActionButton onClick={() => void updateReturn(request, "refunded")}>Refund</ActionButton>
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
