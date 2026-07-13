import { createFileRoute } from "@tanstack/react-router";
import { NotInScope } from "@/components/admin/NotInScope";

export const Route = createFileRoute("/admin/notifications")({
  component: AdminNotifications,
});

function AdminNotifications() {
  return <NotInScope title="Notifications" description="Automated notification workflows are deferred until a real delivery pipeline is added." />;
}
