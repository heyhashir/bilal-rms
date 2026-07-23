import { createFileRoute } from "@tanstack/react-router";
import { NotInScope } from "@/components/admin/NotInScope";

export const Route = createFileRoute("/admin/discounts")({
  component: AdminDiscounts,
});

function AdminDiscounts() {
  return <NotInScope title="Discounts" description="Discount-rule management is not part of the v1 production build." />;
}
