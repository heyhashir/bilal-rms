import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Download, Printer } from "lucide-react";
import { ActionButton, EmptyState, PageHeader, StatCard } from "@/components/admin/primitives";
import { adminReportsApi } from "@/lib/admin-reports-api";
import { adminEmployeesApi } from "@/lib/admin-employees-api";
import { formatPrice } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

export const Route = createFileRoute("/admin/bill-wise")({
  component: AdminBillWiseReport,
});

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function AdminBillWiseReport() {
  const today = useMemo(() => getLocalDateString(), []);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  // Filters
  const [billCashier, setBillCashier] = useState("ALL");
  const [billPayment, setBillPayment] = useState("ALL");
  const [billType, setBillType] = useState("ALL");
  const [billQuery, setBillQuery] = useState("");
  const [expandedBills, setExpandedBills] = useState<Record<string, boolean>>({});

  const { data: billWiseData, isLoading } = useQuery({
    queryKey: ["admin", "reports", "bill-wise", { from, to, cashier: billCashier, paymentMethod: billPayment, type: billType, query: billQuery }],
    queryFn: async () =>
      adminReportsApi.billWise({
        from: from || undefined,
        to: to || undefined,
        cashier: billCashier === "ALL" ? undefined : billCashier,
        paymentMethod: billPayment === "ALL" ? undefined : billPayment,
        type: billType === "ALL" ? undefined : billType,
        query: billQuery || undefined,
      }),
  });

  const { data: employees = [] } = useQuery({
    queryKey: queryKeys.admin.employees,
    queryFn: async () => (await adminEmployeesApi.employees()).employees,
  });

  const billSummary = billWiseData?.summary;
  const bills = billWiseData?.bills ?? [];

  const toggleBill = (id: string) => {
    setExpandedBills((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    bills.forEach((b) => {
      next[b.id] = true;
    });
    setExpandedBills(next);
  };

  const collapseAll = () => {
    setExpandedBills({});
  };

  const setDatePreset = (preset: "today" | "yesterday" | "this_week" | "this_month" | "all_time") => {
    const now = new Date();
    if (preset === "today") {
      const d = getLocalDateString(now);
      setFrom(d);
      setTo(d);
    } else if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const d = getLocalDateString(y);
      setFrom(d);
      setTo(d);
    } else if (preset === "this_week") {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      setFrom(getLocalDateString(start));
      setTo(getLocalDateString(now));
    } else if (preset === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setFrom(getLocalDateString(start));
      setTo(getLocalDateString(now));
    } else if (preset === "all_time") {
      setFrom("");
      setTo("");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Sales & Cash Audit"
        title="Bill-wise sales report."
        description="Comprehensive bill-by-bill cashier collections, receipt line drilldowns, payment methods, and daily audit totals."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton
              variant="ghost"
              onClick={() =>
                window.open(
                  adminReportsApi.exportBillWiseUrl({
                    from: from || undefined,
                    to: to || undefined,
                    cashier: billCashier === "ALL" ? undefined : billCashier,
                    paymentMethod: billPayment === "ALL" ? undefined : billPayment,
                    type: billType === "ALL" ? undefined : billType,
                    query: billQuery || undefined,
                  }),
                  "_blank",
                )
              }
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
            </ActionButton>
            <ActionButton variant="ghost" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5 mr-1" /> Print Audit Sheet
            </ActionButton>

            <div className="flex items-center gap-1 border border-border bg-background p-1 text-xs">
              <button
                type="button"
                onClick={() => setDatePreset("today")}
                className="px-2 py-1 uppercase tracking-wider hover:bg-secondary"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("yesterday")}
                className="px-2 py-1 uppercase tracking-wider hover:bg-secondary"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("this_week")}
                className="px-2 py-1 uppercase tracking-wider hover:bg-secondary"
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("this_month")}
                className="px-2 py-1 uppercase tracking-wider hover:bg-secondary"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("all_time")}
                className="px-2 py-1 uppercase tracking-wider hover:bg-secondary"
              >
                All Time
              </button>
            </div>
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

      {/* Bill-Wise Top Stat Cards */}
      {billSummary && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard
            label="Total Bills"
            value={billSummary.totalBills}
            hint={`${billSummary.totalSalesCount} sales · ${billSummary.totalRefundsCount} refunds`}
          />
          <StatCard
            label="Net Pieces Sold"
            value={`${billSummary.totalQtySold} pcs`}
            hint="Items sold minus returns"
          />
          <StatCard
            label="Cash Collected"
            value={formatPrice(billSummary.netCash)}
            hint="Net register cash"
          />
          <StatCard
            label="Card & Digital"
            value={formatPrice(billSummary.netCard + billSummary.netDigital)}
            hint={`Card ${formatPrice(billSummary.netCard)} · Digital ${formatPrice(billSummary.netDigital)}`}
          />
          <StatCard
            label="Grand Net Collections"
            value={formatPrice(billSummary.grandNetTotal)}
            hint={`Gross ${formatPrice(billSummary.totalSalesAmount)} - Ref ${formatPrice(billSummary.totalRefundAmount)}`}
          />
        </div>
      )}

      {/* Filter Bar */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">Cashier / Operator</label>
          <select
            value={billCashier}
            onChange={(e) => setBillCashier(e.target.value)}
            className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          >
            <option value="ALL">All Cashiers (Admin & Employees)</option>
            <option value="Admin">Admin</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.name}>
                {emp.name} (Employee)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">Payment Method</label>
          <select
            value={billPayment}
            onChange={(e) => setBillPayment(e.target.value)}
            className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          >
            <option value="ALL">All Payment Methods</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="JAZZCASH">JazzCash</option>
            <option value="EASYPAISA">Easypaisa</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">Receipt Type</label>
          <select
            value={billType}
            onChange={(e) => setBillType(e.target.value)}
            className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          >
            <option value="ALL">All Receipts (Sales & Refunds)</option>
            <option value="SALE">Sales Only</option>
            <option value="REFUND">Refunds / Returns Only</option>
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">Search Bills</label>
          <input
            type="text"
            placeholder="Receipt #, customer, phone..."
            value={billQuery}
            onChange={(e) => setBillQuery(e.target.value)}
            className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
      </div>

      {/* Quick expand/collapse controls */}
      <div className="mb-2 flex justify-between items-center text-xs">
        <span className="text-muted-foreground">Showing {bills.length} bills in selected range</span>
        <div className="flex gap-2">
          <button onClick={expandAll} className="underline uppercase tracking-wider text-[11px] text-muted-foreground hover:text-foreground">
            Expand All
          </button>
          <span>·</span>
          <button onClick={collapseAll} className="underline uppercase tracking-wider text-[11px] text-muted-foreground hover:text-foreground">
            Collapse All
          </button>
        </div>
      </div>

      {/* Bill-Wise Main Table */}
      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading bill-wise report...</div>
      ) : bills.length === 0 ? (
        <EmptyState title="No bills found" hint="Try adjusting your date range, cashier, or search filters." />
      ) : (
        <div className="print-billwise-sheet">
          <div className="hidden print:block mb-6 border-b border-black pb-4">
            <div className="text-xl font-bold">BALY by Bilal Garments EST 2001.</div>
            <div className="text-sm font-semibold mt-1">Cash and Credit Details / Bill-Wise Audit Report</div>
            <div className="text-xs text-muted-foreground mt-1">
              Range: {from || "All Time"} to {to || "All Time"} | Cashier: {billCashier} | Total Bills: {billSummary?.totalBills} | Net Total: {formatPrice(billSummary?.grandNetTotal ?? 0)}
            </div>
          </div>

          <div className="overflow-x-auto border border-border">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-widest">
                <tr>
                  <th className="w-10 p-3 text-center print:hidden"></th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Time</th>
                  <th className="p-3 text-left">Receipt #</th>
                  <th className="p-3 text-left">Receipt Type</th>
                  <th className="p-3 text-right">Qty Sold</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-left">Payment</th>
                  <th className="p-3 text-left">Cashier</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => {
                  const isExpanded = Boolean(expandedBills[bill.id]);
                  const isRefund = bill.receiptType === "Refund";
                  return (
                    <Fragment key={bill.id}>
                      <tr className={`border-t border-border hover:bg-secondary/40 ${isRefund ? "bg-sale/5" : ""}`}>
                        <td className="p-3 text-center print:hidden">
                          <button
                            type="button"
                            onClick={() => toggleBill(bill.id)}
                            className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                            title={isExpanded ? "Hide items" : "Show items"}
                          >
                            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </button>
                        </td>
                        <td className="p-3 font-mono text-xs">{bill.date}</td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">{bill.time}</td>
                        <td className="p-3 font-semibold font-mono text-xs">
                          {bill.receiptNumber}
                          {bill.customerName && <div className="font-normal text-muted-foreground text-[11px]">{bill.customerName}</div>}
                        </td>
                        <td className="p-3 uppercase text-xs">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold tracking-wider rounded ${
                              isRefund ? "bg-sale text-primary-foreground" : "bg-secondary text-secondary-foreground"
                            }`}
                          >
                            {bill.receiptType}
                          </span>
                        </td>
                        <td className={`p-3 text-right font-semibold ${bill.qtySold < 0 ? "text-sale" : ""}`}>
                          {bill.qtySold > 0 ? bill.qtySold : bill.qtySold}
                        </td>
                        <td className={`p-3 text-right font-mono font-semibold ${bill.total < 0 ? "text-sale" : ""}`}>
                          {formatPrice(bill.total)}
                        </td>
                        <td className="p-3 uppercase text-xs font-medium">{bill.paymentMethod}</td>
                        <td className="p-3 font-medium text-xs">{bill.cashier}</td>
                      </tr>

                      {/* Expanded Bill Line Items Drilldown */}
                      {isExpanded && bill.items.length > 0 && (
                        <tr className="border-t border-border bg-secondary/30">
                          <td colSpan={9} className="p-4 pl-12">
                            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                              Items on receipt {bill.receiptNumber} ({bill.items.length} lines):
                            </div>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-muted-foreground border-b border-border">
                                  <th className="p-1.5 text-left">Item Name</th>
                                  <th className="p-1.5 text-left">SKU</th>
                                  <th className="p-1.5 text-left">Size / Colour</th>
                                  <th className="p-1.5 text-right">Unit Price</th>
                                  <th className="p-1.5 text-right">Qty</th>
                                  <th className="p-1.5 text-right">Line Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bill.items.map((item, idx) => (
                                  <tr key={idx} className="border-b border-border/50">
                                    <td className="p-1.5 font-medium">{item.name}</td>
                                    <td className="p-1.5 font-mono text-muted-foreground">{item.sku || "-"}</td>
                                    <td className="p-1.5 uppercase">
                                      {item.size || "-"} {item.colorName ? `· ${item.colorName}` : ""}
                                    </td>
                                    <td className="p-1.5 text-right font-mono">{formatPrice(item.unitPrice)}</td>
                                    <td className="p-1.5 text-right font-semibold">{item.qty}</td>
                                    <td className="p-1.5 text-right font-mono font-semibold">{formatPrice(item.lineTotal)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>

              {/* Grand Total Auto-Plus Footer */}
              {billSummary && (
                <tfoot className="border-t-2 border-foreground bg-accent text-accent-foreground font-bold text-sm">
                  <tr>
                    <td className="p-4 print:hidden"></td>
                    <td colSpan={4} className="p-4 text-left uppercase tracking-wider">
                      Grand Total ({billSummary.totalBills} Bills · {billSummary.totalSalesCount} Sales · {billSummary.totalRefundsCount} Refunds)
                    </td>
                    <td className="p-4 text-right">{billSummary.totalQtySold}</td>
                    <td className="p-4 text-right font-mono text-base">{formatPrice(billSummary.grandNetTotal)}</td>
                    <td colSpan={2} className="p-4 text-left text-xs uppercase font-normal">
                      Cash: {formatPrice(billSummary.netCash)} | Card/Dig: {formatPrice(billSummary.netCard + billSummary.netDigital)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
