import { createFileRoute } from "@tanstack/react-router";
import { NotInScope } from "@/components/admin/NotInScope";

export const Route = createFileRoute("/admin/cms")({
  component: AdminCms,
});

function AdminCms() {
  return <NotInScope title="CMS" description="A real CMS workflow is deferred from v1 and the old demo module has been disabled." />;
}
