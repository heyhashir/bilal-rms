import { createFileRoute } from "@tanstack/react-router";
import { NotInScope } from "@/components/admin/NotInScope";

export const Route = createFileRoute("/admin/size-charts")({
  component: AdminSizeCharts,
});

function AdminSizeCharts() {
  return <NotInScope title="Size charts" description="Advanced size-chart management is deferred from the v1 production launch." />;
}
