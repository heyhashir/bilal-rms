import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { adminOrdersApi } from "@/lib/admin-orders-api";
import { formatPrice } from "@/lib/format";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import type { Order } from "@/lib/account-types";
import { ActionButton, EmptyState, Modal, PageHeader, Pagination, Toolbar } from "@/components/admin/primitives";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

const statuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const paymentStatuses = ["pending", "proof_uploaded", "verified", "rejected", "cod_due", "refunded"];

function AdminOrders() {
  const [view, setView] = useState<Order | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.admin.ordersList({ page, query }),
    queryFn: async () => adminOrdersApi.orders({ page, pageSize: 20, query }),
  });
  const orders = data?.orders ?? [];
  const meta = data?.meta;

  const updateStatus = useMutation({
    mutationFn: async (params: { orderNumber: string; status: string; paymentStatus?: string }) =>
      adminOrdersApi.updateOrderStatus(params.orderNumber, {
        orderStatus: params.status,
        ...(params.paymentStatus ? { paymentStatus: params.paymentStatus } : {}),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders });
    },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Online orders"
        title={`Orders (${meta?.total ?? orders.length})`}
        description="Cloud ecommerce orders, payment-proof review, and shipping lifecycle updates."
        action={<ActionButton variant="ghost" onClick={() => window.open(adminOrdersApi.exportUrl({ query }), "_blank")}>Export CSV</ActionButton>}
      />
      <Toolbar
        search={query}
        onSearch={(value) => {
          setQuery(value);
          setPage(1);
        }}
      />
      {isLoading ? (
        <EmptyState title="Loading orders" hint="Fetching the latest ecommerce orders." />
      ) : orders.length === 0 ? (
        <EmptyState title="No orders yet" hint="Guest and account checkouts will appear here." />
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="p-3 text-left">Order</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Total</th>
                <th className="p-3 text-left">Order status</th>
                <th className="p-3 text-left">Payment</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-border">
                  <td className="p-3 font-semibold">{order.id}</td>
                  <td className="p-3">
                    <div>{order.customerName}</div>
                    <div className="text-xs text-muted-foreground">{order.email}</div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</td>
                  <td className="p-3 font-semibold">{formatPrice(order.total)}</td>
                  <td className="p-3">
                    <select
                      value={order.status}
                      onChange={(e) =>
                        updateStatus.mutate({ orderNumber: order.id, status: e.target.value, paymentStatus: order.paymentStatus })
                      }
                      className="border border-border bg-background px-2 py-1 text-xs uppercase tracking-widest"
                    >
                      {statuses.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    <select
                      value={order.paymentStatus}
                      onChange={(e) =>
                        updateStatus.mutate({ orderNumber: order.id, status: order.status, paymentStatus: e.target.value })
                      }
                      className="border border-border bg-background px-2 py-1 text-xs uppercase tracking-widest"
                    >
                      {paymentStatuses.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => setView(order)} className="text-xs uppercase tracking-widest underline">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={meta?.page ?? page} pages={meta?.pages ?? 1} onChange={setPage} />

      {view && (
        <Modal title={`Order ${view.id}`} onClose={() => setView(null)}>
          <div className="space-y-4 text-sm">
            <div>
              <div className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">Customer</div>
              <div>{view.customerName} · {view.email}</div>
              <div className="text-muted-foreground">{view.shipping.phone}</div>
            </div>
            <div>
              <div className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">Ship to</div>
              <div>{view.shipping.address}, {view.shipping.city} {view.shipping.postal}</div>
            </div>
            <div>
              <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Items</div>
              {view.lines.map((line) => (
                <div key={line.id} className="flex justify-between border-t border-border py-2">
                  <span>{line.name} <span className="text-muted-foreground">· {line.color}/{line.size} ×{line.qty}</span></span>
                  <span>{formatPrice(line.unitPrice * line.qty)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between border-t border-border pt-3 font-semibold">
              <span>Total</span><span>{formatPrice(view.total)}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
