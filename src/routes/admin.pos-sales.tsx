import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Printer, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { adminPosApi } from "@/lib/admin-pos-api";
import type { PosSale } from "@/lib/admin-types";
import { syncApi } from "@/lib/sync-api";
import { formatPrice } from "@/lib/format";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import {
  ActionButton,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Pagination,
  StatCard,
  StatusPill,
  Toolbar,
} from "@/components/admin/primitives";

export const Route = createFileRoute("/admin/pos-sales")({
  component: AdminPosSales,
});

function AdminPosSales() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<PosSale | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [refundItems, setRefundItems] = useState<Record<string, number>>({});

  const { data: salesResponse, isLoading: loading } = useQuery({
    queryKey: queryKeys.admin.posSalesList({ page, query }),
    queryFn: async () => adminPosApi.posSales({ page, pageSize: 20, query }),
    refetchOnWindowFocus: true,
  });
  const sales = salesResponse?.sales ?? [];
  const meta = salesResponse?.meta;

  const { data: syncDiagnostics } = useQuery({
    queryKey: queryKeys.admin.syncDiagnostics,
    queryFn: syncApi.syncDiagnostics,
    refetchOnWindowFocus: true,
  });

  const refundSale = useMutation({
    mutationFn: (payload: { saleNumber: string; reason: string; note?: string; items: Array<{ saleItemId: string; qty: number }> }) =>
      adminPosApi.refundPosSale(payload.saleNumber, {
        reason: payload.reason,
        note: payload.note,
        items: payload.items,
      }),
    onSuccess: async ({ sale }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.posSales }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.syncDiagnostics }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.inventorySnapshot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.inventoryLedger }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.commissions }),
      ]);
      setView(sale);
      toast.success("Refund processed");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to process refund"));
    },
  });

  const failedJobs = syncDiagnostics?.jobs.filter((job) => job.status === "failed").slice(0, 5) ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Retail POS"
        title={`POS sales (${meta?.total ?? sales.length})`}
        description="In-store bills, receipt numbers, sync status, and counter refunds."
        action={
          <>
            <ActionButton variant="ghost" onClick={() => window.open(adminPosApi.exportUrl({ query }), "_blank")}>Export CSV</ActionButton>
            <ActionButton onClick={() => window.open("/pos", "_blank")}>Open POS terminal</ActionButton>
          </>
        }
      />
      {syncDiagnostics && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Register devices" value={syncDiagnostics.summary.devices} />
          <StatCard label="Failed devices" value={syncDiagnostics.summary.failedDevices} tone={syncDiagnostics.summary.failedDevices > 0 ? "down" : "flat"} />
          <StatCard label="Pending sync jobs" value={syncDiagnostics.summary.pendingJobs} tone={syncDiagnostics.summary.pendingJobs > 0 ? "flat" : "up"} />
          <StatCard label="Failed sync jobs" value={syncDiagnostics.summary.failedJobs} tone={syncDiagnostics.summary.failedJobs > 0 ? "down" : "flat"} />
        </div>
      )}
      {syncDiagnostics && syncDiagnostics.devices.length > 0 && (
        <div className="mb-6 overflow-x-auto border border-border">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="p-3 text-left">Device</th>
                <th className="p-3 text-left">Bootstrap</th>
                <th className="p-3 text-left">Last sync</th>
                <th className="p-3 text-left">Cursor</th>
                <th className="p-3 text-left">Pending</th>
                <th className="p-3 text-left">Failed</th>
                <th className="p-3 text-left">Retries</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {syncDiagnostics.devices.map((device) => (
                <tr key={device.id} className="border-t border-border">
                  <td className="p-3 font-medium">{device.name}</td>
                  <td className="p-3 text-muted-foreground">{device.lastBootstrapAt ? new Date(device.lastBootstrapAt).toLocaleString() : "Never"}</td>
                  <td className="p-3 text-muted-foreground">{device.lastSyncAt ? new Date(device.lastSyncAt).toLocaleString() : "Never"}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{device.lastCursor ?? "-"}</td>
                  <td className="p-3">{device.pendingJobs}</td>
                  <td className="p-3">{device.failedJobs}</td>
                  <td className="p-3">{device.retryCount}</td>
                  <td className="p-3">
                    <StatusPill status={device.syncStatus} />
                    {device.lastSyncError && <div className="mt-1 text-xs text-sale">{device.lastSyncError}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Toolbar
        search={query}
        onSearch={(value) => {
          setQuery(value);
          setPage(1);
        }}
      />
      {loading ? (
        <EmptyState title="Loading POS sales" hint="Fetching live billing history from the server." />
      ) : sales.length === 0 ? (
        <EmptyState title="No POS sales yet" hint="Sales created in the POS terminal will appear here." />
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="p-3 text-left">Sale</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Receipt</th>
                <th className="p-3 text-left">Payment</th>
                <th className="p-3 text-left">Total</th>
                <th className="p-3 text-left">Sync</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-t border-border">
                  <td className="p-3 font-medium">
                    {sale.saleNumber}
                    <div className="text-xs text-muted-foreground">{new Date(sale.createdAt).toLocaleString()}</div>
                  </td>
                  <td className="p-3">
                    {sale.customerName || "Walk-in"}
                    <div className="text-xs text-muted-foreground">{sale.customerPhone || "-"}</div>
                  </td>
                  <td className="p-3">{sale.receipt?.receiptNumber ?? "Draft"}</td>
                  <td className="p-3 uppercase">{sale.paymentMethod}</td>
                  <td className="p-3 font-semibold">{formatPrice(sale.total)}</td>
                  <td className="p-3"><StatusPill status={sale.syncedStatus} /></td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setView(sale)} className="text-xs uppercase tracking-widest underline">View</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={meta?.page ?? page} pages={meta?.pages ?? 1} onChange={setPage} />

      {failedJobs.length > 0 && (
        <div className="mt-6 border border-border">
          <div className="border-b border-border p-4">
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Sync recovery queue</div>
            <div className="mt-2 text-sm text-muted-foreground">These device jobs failed in cloud sync and need operator review or retry from the POS runtime.</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-widest">
                <tr>
                  <th className="p-3 text-left">Device</th>
                  <th className="p-3 text-left">Entity</th>
                  <th className="p-3 text-left">Direction</th>
                  <th className="p-3 text-left">Attempts</th>
                  <th className="p-3 text-left">Last error</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {failedJobs.map((job) => (
                  <tr key={job.id} className="border-t border-border">
                    <td className="p-3">{job.deviceName || job.deviceId || "Unknown device"}</td>
                    <td className="p-3">{job.entityType}{job.entityId ? ` | ${job.entityId}` : ""}</td>
                    <td className="p-3 uppercase">{job.direction}</td>
                    <td className="p-3">{job.attempts}</td>
                    <td className="p-3 text-muted-foreground">{job.lastError || "Unknown error"}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <ActionButton
                          variant="ghost"
                          onClick={async () => {
                            await syncApi.retryJob(job.id);
                            await queryClient.invalidateQueries({ queryKey: queryKeys.admin.syncDiagnostics });
                            toast.success("Sync job moved back to pending");
                          }}
                        >
                          Retry
                        </ActionButton>
                        <ActionButton
                          variant="ghost"
                          onClick={async () => {
                            await syncApi.resolveJob(job.id);
                            await queryClient.invalidateQueries({ queryKey: queryKeys.admin.syncDiagnostics });
                            toast.success("Sync job marked resolved");
                          }}
                        >
                          Resolve
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view && (
        <Modal
          title={`POS sale ${view.saleNumber}`}
          onClose={() => {
            setView(null);
            setRefundReason("");
            setRefundNote("");
            setRefundItems({});
          }}
          wide
          footer={
            <>
              <ActionButton variant="ghost" onClick={() => setView(null)}>Close</ActionButton>
              <ActionButton
                variant="ghost"
                onClick={async () => {
                  const payload = await adminPosApi.recordReprint(view.saleNumber);
                  setView(payload.sale);
                  window.print();
                }}
              >
                <Printer className="h-3.5 w-3.5" /> Print
              </ActionButton>
              <ActionButton
                onClick={() => {
                  const items = Object.entries(refundItems)
                    .filter(([, qty]) => qty > 0)
                    .map(([saleItemId, qty]) => ({ saleItemId, qty }));

                  if (items.length === 0) {
                    toast.error("Select at least one refund item quantity");
                    return;
                  }

                  refundSale.mutate({
                    saleNumber: view.saleNumber,
                    reason: refundReason || "Counter refund",
                    note: refundNote,
                    items,
                  });
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Refund selected
              </ActionButton>
            </>
          }
        >
          <div className="space-y-5">
            <div className="grid gap-3 text-sm md:grid-cols-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Receipt</div>
                <div>{view.receipt?.receiptNumber ?? "Draft"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Customer</div>
                <div>{view.customerName || "Walk-in customer"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Payment</div>
                <div>{view.paymentMethod}</div>
              </div>
            </div>

            <div className="border border-border">
              {view.items.map((line) => {
                const remaining = line.qty - line.refundedQty;
                return (
                  <div key={line.id} className="grid gap-3 border-b border-border p-3 last:border-0 md:grid-cols-[1.4fr_0.6fr_0.6fr_0.8fr]">
                    <div>
                      <div className="font-medium">{line.name}</div>
                      <div className="text-xs text-muted-foreground">{[line.size, line.color, line.employeeName].filter(Boolean).join(" | ")}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Qty</div>
                      <div>{line.qty} total | {line.refundedQty} refunded</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Line total</div>
                      <div>{formatPrice(line.lineTotal)}</div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">Refund qty</label>
                      <input
                        type="number"
                        min={0}
                        max={remaining}
                        value={refundItems[line.id] ?? 0}
                        onChange={(event) =>
                          setRefundItems((current) => ({
                            ...current,
                            [line.id]: Math.min(remaining, Math.max(0, Number(event.target.value) || 0)),
                          }))
                        }
                        className="w-full border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Refund reason" value={refundReason} onChange={setRefundReason} />
              <Field label="Refund note" value={refundNote} onChange={setRefundNote} />
            </div>

            <div className="border-t border-border pt-3 text-right font-semibold">Sale total: {formatPrice(view.total)}</div>
          </div>
        </Modal>
      )}
    </div>
  );
}
