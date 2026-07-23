import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { formatPrice } from "@/lib/format";
import { orderApi } from "@/lib/order-api";

export const Route = createFileRoute("/invoice/$orderNumber")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: InvoicePage,
});

function InvoicePage() {
  const { orderNumber } = Route.useParams();
  const { token } = Route.useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["orders", "invoice", orderNumber, token],
    queryFn: async () => orderApi.getOrder(orderNumber, token || undefined),
  });

  const order = data?.order;

  if (isLoading || !order) {
    return <div className="container-bg py-24 text-center text-muted-foreground">Loading invoice...</div>;
  }

  return (
    <div className="container-bg py-10 md:py-14">
      <div className="mx-auto max-w-4xl border border-border bg-background p-8 print:border-0 print:p-0">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
          <div>
            <div className="display text-3xl">BALY by Bilal Garments EST 2001.</div>
            <div className="mt-2 text-sm text-muted-foreground">Order invoice</div>
          </div>
          <div className="text-sm">
            <div className="font-semibold">{order.id}</div>
            <div className="text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section>
            <div className="mb-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">Bill to</div>
            <div className="font-medium">{order.customerName}</div>
            <div className="text-sm text-muted-foreground">{order.email}</div>
            <div className="text-sm text-muted-foreground">{order.shipping.phone}</div>
          </section>
          <section>
            <div className="mb-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">Ship to</div>
            <div className="font-medium">{order.shipping.address}</div>
            {order.shipping.address2 && <div className="text-sm text-muted-foreground">{order.shipping.address2}</div>}
            <div className="text-sm text-muted-foreground">
              {order.shipping.city}, {order.shipping.postal}, {order.shipping.country}
            </div>
            <div className="text-sm text-muted-foreground">{order.shipping.zone}</div>
          </section>
        </div>

        <div className="mt-8 overflow-x-auto border border-border">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-left">Variant</th>
                <th className="p-3 text-left">Qty</th>
                <th className="p-3 text-left">Unit</th>
                <th className="p-3 text-left">Line total</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => (
                <tr key={line.id} className="border-t border-border">
                  <td className="p-3 font-medium">{line.name}</td>
                  <td className="p-3 text-muted-foreground">{[line.size, line.color].filter(Boolean).join(" / ") || "Base product"}</td>
                  <td className="p-3">{line.qty}</td>
                  <td className="p-3">{formatPrice(line.unitPrice)}</td>
                  <td className="p-3 font-semibold">{formatPrice(line.unitPrice * line.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 ml-auto max-w-sm space-y-2 text-sm">
          <InvoiceRow label="Subtotal" value={formatPrice(order.subtotal)} />
          <InvoiceRow label="Shipping" value={formatPrice(order.shippingFee)} />
          <InvoiceRow label="Payment" value={order.payment.toUpperCase()} />
          <InvoiceRow label="Payment status" value={order.paymentStatus.toUpperCase()} />
          <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 print:hidden">
          <button onClick={() => window.print()} className="bg-primary px-6 py-3 text-xs uppercase tracking-widest text-primary-foreground">
            Print invoice
          </button>
          <Link to="/track-order" className="border border-border px-6 py-3 text-xs uppercase tracking-widest">
            Track another order
          </Link>
        </div>
      </div>
    </div>
  );
}

function InvoiceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
