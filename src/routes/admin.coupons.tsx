import { createFileRoute } from "@tanstack/react-router";
import { NotInScope } from "@/components/admin/NotInScope";

export const Route = createFileRoute("/admin/coupons")({
  component: AdminCoupons,
});

function AdminCoupons() {
  return <NotInScope title="Coupons" description="Coupon and promotion workflows are deferred from the launch scope." />;
}
