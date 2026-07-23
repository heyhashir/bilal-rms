import { createFileRoute } from "@tanstack/react-router";
import { NotInScope } from "@/components/admin/NotInScope";

export const Route = createFileRoute("/admin/roles")({
  component: AdminRoles,
});

function AdminRoles() {
  return <NotInScope title="Roles" description="Multi-role and permission management is deferred from the single-owner launch build." />;
}
