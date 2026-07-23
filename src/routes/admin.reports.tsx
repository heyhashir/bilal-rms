import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ActionButton, EmptyState, Field, PageHeader, SelectField, StatCard } from "@/components/admin/primitives";
import { getErrorMessage } from "@/lib/api";
import { adminBackofficeApi } from "@/lib/admin-backoffice-api";
import { adminReportsApi } from "@/lib/admin-reports-api";
import { formatPrice } from "@/lib/format";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";

export const Route = createFileRoute("/admin/reports")({
  component: AdminReports,
});

function AdminReports() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [ledgerDraft, setLedgerDraft] = useState({
    type: "expense" as "expense" | "adjustment",
    direction: "debit" as "credit" | "debit",
    amount: "0",
    reference: "",
    note: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.admin.reports({ from, to }),
    queryFn: async () => adminReportsApi.summary({ from, to }),
  });
  const { data: ledgerEntries = [] } = useQuery({
    queryKey: ["admin", "ledger", { from, to }],
    queryFn: async () => (await adminBackofficeApi.ledgerEntries({ from, to })).entries,
  });

  const createLedgerEntry = useMutation({
    mutationFn: adminBackofficeApi.createLedgerEntry,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.reports({ from, to }) }),
        queryClient.invalidateQueries({ queryKey: ["admin", "ledger"] }),
      ]);
      setLedgerDraft({
        type: "expense",
        direction: "debit",
        amount: "0",
        reference: "",
        note: "",
      });
      toast.success("Ledger entry saved");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Unable to save ledger entry")),
  });

  const summary = data?.summary;

  return (
    <div>
      <PageHeader
        eyebrow="Reports"
        title="Range reporting."
        description="Cloud-authoritative revenue, profit, ledger, refunds, and commission summaries for the selected date range."
        action={
          <div className="flex flex-wrap gap-2">
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="border border-border bg-background px-3 py-2 text-sm" />
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="border border-border bg-background px-3 py-2 text-sm" />
          </div>
        }
      />

      {isLoading || !summary ? (
        <EmptyState title="Loading reports" hint="Calculating date-range totals from live cloud data." />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
            <StatCard label="Online revenue" value={formatPrice(summary.overview.onlineRevenue)} />
            <StatCard label="POS revenue" value={formatPrice(summary.overview.posRevenue)} />
            <StatCard label="POS refunds" value={formatPrice(summary.overview.posRefundAmount)} />
            <StatCard label="Online orders" value={summary.overview.onlineOrders} />
            <StatCard label="POS sales" value={summary.overview.posSales} />
            <StatCard label="Gross profit" value={formatPrice(summary.profit.total)} />
            <StatCard label="Ledger credit" value={formatPrice(summary.ledger.credit)} />
            <StatCard label="Ledger net" value={formatPrice(summary.ledger.net)} />
          </div>

          <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Commission earned" value={formatPrice(summary.commissions.earned)} />
            <StatCard label="Commission reversed" value={formatPrice(summary.commissions.reversed)} />
            <StatCard label="Commission paid" value={formatPrice(summary.commissions.paid)} />
            <StatCard label="Commission payable" value={formatPrice(summary.commissions.payable)} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="border border-border">
              <div className="border-b border-border p-4">
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Employees</div>
                <div className="mt-2 text-sm text-muted-foreground">Daily and range commission reconciliation by employee.</div>
              </div>
              {summary.employees.length === 0 ? (
                <EmptyState title="No employee commission in this range" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-secondary text-xs uppercase tracking-widest">
                      <tr>
                        <th className="p-3 text-left">Employee</th>
                        <th className="p-3 text-left">Earned</th>
                        <th className="p-3 text-left">Reversed</th>
                        <th className="p-3 text-left">Paid</th>
                        <th className="p-3 text-left">Payable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.employees.map((entry) => (
                        <tr key={entry.employeeId} className="border-t border-border">
                          <td className="p-3 font-medium">{entry.employeeName}</td>
                          <td className="p-3">{formatPrice(entry.earned)}</td>
                          <td className="p-3">{formatPrice(entry.reversed)}</td>
                          <td className="p-3">{formatPrice(entry.paid)}</td>
                          <td className="p-3 font-semibold">{formatPrice(entry.payable)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="border border-border">
              <div className="border-b border-border p-4">
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Products</div>
                <div className="mt-2 text-sm text-muted-foreground">Commission contribution by product for the selected range.</div>
              </div>
              {summary.products.length === 0 ? (
                <EmptyState title="No product commission in this range" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-secondary text-xs uppercase tracking-widest">
                      <tr>
                        <th className="p-3 text-left">Product</th>
                        <th className="p-3 text-left">Earned</th>
                        <th className="p-3 text-left">Reversed</th>
                        <th className="p-3 text-left">Paid</th>
                        <th className="p-3 text-left">Payable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.products.map((entry) => (
                        <tr key={entry.productId} className="border-t border-border">
                          <td className="p-3 font-medium">{entry.productName}</td>
                          <td className="p-3">{formatPrice(entry.earned)}</td>
                          <td className="p-3">{formatPrice(entry.reversed)}</td>
                          <td className="p-3">{formatPrice(entry.paid)}</td>
                          <td className="p-3 font-semibold">{formatPrice(entry.payable)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <section className="border border-border">
              <div className="border-b border-border p-4">
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Profit by category</div>
                <div className="mt-2 text-sm text-muted-foreground">Margin rollup across online orders and synced POS sales.</div>
              </div>
              {summary.profit.byCategory.length === 0 ? (
                <EmptyState title="No profit data in this range" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="bg-secondary text-xs uppercase tracking-widest">
                      <tr>
                        <th className="p-3 text-left">Category</th>
                        <th className="p-3 text-left">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.profit.byCategory.map((entry) => (
                        <tr key={entry.categorySlug} className="border-t border-border">
                          <td className="p-3 font-medium">{entry.categoryName}</td>
                          <td className="p-3">{formatPrice(entry.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="border border-border">
              <div className="border-b border-border p-4">
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Profit by product</div>
                <div className="mt-2 text-sm text-muted-foreground">Top profit contributors with their category rollup.</div>
              </div>
              {summary.profit.byProduct.length === 0 ? (
                <EmptyState title="No product profit in this range" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-secondary text-xs uppercase tracking-widest">
                      <tr>
                        <th className="p-3 text-left">Product</th>
                        <th className="p-3 text-left">Category</th>
                        <th className="p-3 text-left">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.profit.byProduct.map((entry) => (
                        <tr key={entry.productId} className="border-t border-border">
                          <td className="p-3 font-medium">{entry.productName}</td>
                          <td className="p-3">{entry.categoryName}</td>
                          <td className="p-3">{formatPrice(entry.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <section className="border border-border p-5">
              <div className="mb-4">
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Manual ledger entry</div>
                <div className="mt-2 text-sm text-muted-foreground">Record manual expenses or adjustments directly against the reporting ledger.</div>
              </div>
              <div className="grid gap-3">
                <SelectField
                  label="Entry type"
                  value={ledgerDraft.type}
                  onChange={(value) => setLedgerDraft((current) => ({ ...current, type: value as "expense" | "adjustment" }))}
                  options={[
                    { value: "expense", label: "Expense" },
                    { value: "adjustment", label: "Adjustment" },
                  ]}
                />
                <SelectField
                  label="Direction"
                  value={ledgerDraft.direction}
                  onChange={(value) => setLedgerDraft((current) => ({ ...current, direction: value as "credit" | "debit" }))}
                  options={[
                    { value: "debit", label: "Debit" },
                    { value: "credit", label: "Credit" },
                  ]}
                />
                <Field label="Amount" type="number" value={ledgerDraft.amount} onChange={(value) => setLedgerDraft((current) => ({ ...current, amount: value }))} />
                <Field label="Reference" value={ledgerDraft.reference} onChange={(value) => setLedgerDraft((current) => ({ ...current, reference: value }))} />
                <Field label="Note" value={ledgerDraft.note} onChange={(value) => setLedgerDraft((current) => ({ ...current, note: value }))} textarea />
                <ActionButton
                  onClick={() =>
                    createLedgerEntry.mutate({
                      type: ledgerDraft.type,
                      direction: ledgerDraft.direction,
                      amount: Number(ledgerDraft.amount),
                      reference: ledgerDraft.reference || undefined,
                      note: ledgerDraft.note || undefined,
                    })
                  }
                >
                  Save ledger entry
                </ActionButton>
              </div>
            </section>

            <section className="border border-border">
              <div className="border-b border-border p-4">
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Ledger activity</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {summary.ledger.count} entries in range - debit {formatPrice(summary.ledger.debit)} - credit {formatPrice(summary.ledger.credit)}
                </div>
              </div>
              {ledgerEntries.length === 0 ? (
                <EmptyState title="No ledger entries in this range" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-secondary text-xs uppercase tracking-widest">
                      <tr>
                        <th className="p-3 text-left">Date</th>
                        <th className="p-3 text-left">Type</th>
                        <th className="p-3 text-left">Direction</th>
                        <th className="p-3 text-left">Reference</th>
                        <th className="p-3 text-left">Note</th>
                        <th className="p-3 text-left">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerEntries.map((entry) => (
                        <tr key={entry.id} className="border-t border-border">
                          <td className="p-3">{new Date(entry.createdAt).toLocaleString()}</td>
                          <td className="p-3 uppercase">{entry.type}</td>
                          <td className="p-3 uppercase">{entry.direction}</td>
                          <td className="p-3">{entry.reference || "-"}</td>
                          <td className="p-3">{entry.note || "-"}</td>
                          <td className="p-3">{formatPrice(entry.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
