import { createFileRoute } from "@tanstack/react-router";
import { NotInScope } from "@/components/admin/NotInScope";

export const Route = createFileRoute("/admin/suppliers")({
  component: AdminSuppliers,
});

function AdminSuppliers() {
  return <NotInScope title="Suppliers" description="Supplier management is deferred until procurement workflows are implemented." />;
}
