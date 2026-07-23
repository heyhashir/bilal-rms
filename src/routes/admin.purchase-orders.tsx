import { createFileRoute } from "@tanstack/react-router";
import { NotInScope } from "@/components/admin/NotInScope";

export const Route = createFileRoute("/admin/purchase-orders")({
  component: AdminPurchaseOrders,
});

function AdminPurchaseOrders() {
  return <NotInScope title="Purchase orders" description="Procurement and supplier purchase-order flows are deferred from the launch scope." />;
}
