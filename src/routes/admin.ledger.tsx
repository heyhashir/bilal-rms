import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { ActionButton, EmptyState, Field, PageHeader, SelectField, StatCard } from "@/components/admin/primitives";
import { getErrorMessage } from "@/lib/api";
import { adminBackofficeApi } from "@/lib/admin-backoffice-api";
import { formatPrice } from "@/lib/format";
import { queryClient } from "@/lib/query-client";

export const Route = createFileRoute("/admin/ledger")({
  component: AdminLedger,
});

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function AdminLedger() {
  const today = useMemo(() => getLocalDateString(), []);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const [ledgerDraft, setLedgerDraft] = useState({
    type: "expense" as "expense" | "adjustment",
    direction: "debit" as "credit" | "debit",
    amount: "0",
    reference: "",
    note: "",
  });
  const [editingLedgerId, setEditingLedgerId] = useState<string | null>(null);

  const { data: ledgerEntries = [], isLoading } = useQuery({
    queryKey: ["admin", "ledger", { from, to }],
    queryFn: async () => (await adminBackofficeApi.ledgerEntries({ from: from || undefined, to: to || undefined })).entries,
  });

  const createLedgerEntry = useMutation({
    mutationFn: adminBackofficeApi.createLedgerEntry,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "ledger"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "reports"] }),
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

  const updateLedgerEntry = useMutation({
    mutationFn: ({ id, ...payload }: { id: string; type: "expense" | "adjustment"; direction: "credit" | "debit"; amount: number; reference?: string; note?: string }) =>
      adminBackofficeApi.updateLedgerEntry(id, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "ledger"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "reports"] }),
      ]);
      setEditingLedgerId(null);
      setLedgerDraft({ type: "expense", direction: "debit", amount: "0", reference: "", note: "" });
      toast.success("Ledger entry updated");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Unable to update ledger entry")),
  });

  const deleteLedgerEntry = useMutation({
    mutationFn: adminBackofficeApi.deleteLedgerEntry,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "ledger"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "reports"] }),
      ]);
      toast.success("Manual ledger entry deleted");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Unable to delete ledger entry")),
  });

  const totalDebit = ledgerEntries.filter((e) => e.direction === "debit").reduce((sum, e) => sum + e.amount, 0);
  const totalCredit = ledgerEntries.filter((e) => e.direction === "credit").reduce((sum, e) => sum + e.amount, 0);
  const netExpense = totalDebit - totalCredit;

  return (
    <div>
      <PageHeader
        eyebrow="Finance & Bookkeeping"
        title="Expense & adjustment ledger."
        description="Record and track manual shop operational expenses, utility bills, tea/petty cash, and debit/credit adjustments."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="border border-border bg-background px-3 py-2 text-sm"
              title="From date"
            />
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="border border-border bg-background px-3 py-2 text-sm"
              title="To date"
            />
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Entries" value={ledgerEntries.length} hint="In selected range" />
        <StatCard label="Total Debits (Expenses)" value={formatPrice(totalDebit)} hint="Cash outgoing" />
        <StatCard label="Total Credits (Adjustments)" value={formatPrice(totalCredit)} hint="Cash incoming" />
        <StatCard label="Net Ledger Balance" value={formatPrice(netExpense)} hint="Net expenses in range" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="border border-border p-5">
          <div className="mb-4">
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">New manual entry</div>
            <div className="mt-2 text-sm text-muted-foreground">Record daily petty cash, shop repairs, bills, or cash draw entries.</div>
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
                { value: "debit", label: "Debit (Outgoing / Expense)" },
                { value: "credit", label: "Credit (Incoming / Adjustment)" },
              ]}
            />
            <Field label="Amount (PKR)" type="number" value={ledgerDraft.amount} onChange={(value) => setLedgerDraft((current) => ({ ...current, amount: value }))} />
            <Field label="Reference / Receipt #" value={ledgerDraft.reference} placeholder="e.g. Electricity Bill, Tea Bill" onChange={(value) => setLedgerDraft((current) => ({ ...current, reference: value }))} />
            <Field label="Note" value={ledgerDraft.note} placeholder="Additional details..." onChange={(value) => setLedgerDraft((current) => ({ ...current, note: value }))} textarea />
            <ActionButton
              onClick={() => {
                const payload = {
                  type: ledgerDraft.type,
                  direction: ledgerDraft.direction,
                  amount: Number(ledgerDraft.amount),
                  reference: ledgerDraft.reference || undefined,
                  note: ledgerDraft.note || undefined,
                };
                if (editingLedgerId) {
                  updateLedgerEntry.mutate({ id: editingLedgerId, ...payload });
                } else {
                  createLedgerEntry.mutate(payload);
                }
              }}
            >
              {editingLedgerId ? "Update ledger entry" : "Save ledger entry"}
            </ActionButton>
            {editingLedgerId && (
              <ActionButton
                variant="ghost"
                onClick={() => {
                  setEditingLedgerId(null);
                  setLedgerDraft({ type: "expense", direction: "debit", amount: "0", reference: "", note: "" });
                }}
              >
                <X className="h-3.5 w-3.5 mr-1" /> Cancel edit
              </ActionButton>
            )}
          </div>
        </section>

        <section className="border border-border">
          <div className="border-b border-border p-4">
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Ledger history</div>
            <div className="mt-2 text-sm text-muted-foreground">
              {ledgerEntries.length} entries · Total Outgoing {formatPrice(totalDebit)}
            </div>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading ledger entries...</div>
          ) : ledgerEntries.length === 0 ? (
            <EmptyState title="No ledger entries in this range" hint="Record an expense or adjustment using the form on the left." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-secondary text-xs uppercase tracking-widest">
                  <tr>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-left">Direction</th>
                    <th className="p-3 text-left">Reference</th>
                    <th className="p-3 text-left">Note</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntries.map((entry) => (
                    <tr key={entry.id} className="border-t border-border hover:bg-secondary/40 transition-colors">
                      <td className="p-3 text-xs text-muted-foreground font-mono">{new Date(entry.createdAt).toLocaleString()}</td>
                      <td className="p-3 uppercase text-xs font-semibold">{entry.type}</td>
                      <td className="p-3 uppercase text-xs">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${entry.direction === "debit" ? "bg-sale/10 text-sale" : "bg-secondary"}`}>
                          {entry.direction}
                        </span>
                      </td>
                      <td className="p-3 font-medium">{entry.reference || "-"}</td>
                      <td className="p-3 text-muted-foreground text-xs">{entry.note || "-"}</td>
                      <td className={`p-3 text-right font-mono font-semibold ${entry.direction === "debit" ? "text-sale" : ""}`}>{formatPrice(entry.amount)}</td>
                      <td className="p-3">
                        {entry.isManual && (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              aria-label="Edit manual ledger entry"
                              onClick={() => {
                                setEditingLedgerId(entry.id);
                                setLedgerDraft({
                                  type: entry.type as "expense" | "adjustment",
                                  direction: entry.direction as "credit" | "debit",
                                  amount: String(entry.amount),
                                  reference: entry.reference,
                                  note: entry.note,
                                });
                              }}
                              className="p-2 hover:bg-secondary"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label="Delete manual ledger entry"
                              onClick={() => {
                                if (confirm("Delete this manual ledger entry? Reports will be recalculated immediately.")) {
                                  deleteLedgerEntry.mutate(entry.id);
                                }
                              }}
                              className="p-2 hover:bg-sale hover:text-primary-foreground"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
