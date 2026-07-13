import { createFileRoute } from "@tanstack/react-router";
import { NotInScope } from "@/components/admin/NotInScope";

export const Route = createFileRoute("/admin/activity")({
  component: AdminActivity,
});

function AdminActivity() {
  return <NotInScope title="Activity feed" description="The demo activity feed is disabled in the production launch build." />;
}
