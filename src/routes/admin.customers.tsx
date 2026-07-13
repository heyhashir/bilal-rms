import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminCustomersApi } from "@/lib/admin-customers-api";
import { formatPrice } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { ActionButton, EmptyState, PageHeader, Pagination, Toolbar } from "@/components/admin/primitives";

export const Route = createFileRoute("/admin/customers")({
  component: AdminCustomers,
});

function AdminCustomers() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.admin.customersList({ page, query }),
    queryFn: async () => adminCustomersApi.customers({ page, pageSize: 20, query }),
  });
  const customers = data?.customers ?? [];
  const meta = data?.meta;

  return (
    <div>
      <PageHeader
        eyebrow="Customers"
        title={`Customers (${meta?.total ?? customers.length})`}
        description="Customer accounts with cloud-backed order counts and spend totals."
        action={<ActionButton variant="ghost" onClick={() => window.open(adminCustomersApi.exportUrl({ query }), "_blank")}>Export CSV</ActionButton>}
      />
      <Toolbar search={query} onSearch={(value) => { setQuery(value); setPage(1); }} />
      {isLoading ? (
        <EmptyState title="Loading customers" hint="Fetching customer metrics from the server." />
      ) : customers.length === 0 ? (
        <EmptyState title="No customers found" hint="Customer accounts and guest-linked spend will appear here." />
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="min-w-[600px] w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Joined</th>
                <th className="p-3 text-left">Orders</th>
                <th className="p-3 text-left">Spend</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                return (
                  <tr key={customer.id} className="border-t border-border">
                    <td className="p-3 font-medium">{customer.name}</td>
                    <td className="p-3 text-muted-foreground">{customer.email}</td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(customer.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">{customer.orderCount}</td>
                    <td className="p-3 font-semibold">{formatPrice(customer.totalSpend)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={meta?.page ?? page} pages={meta?.pages ?? 1} onChange={setPage} />
    </div>
  );
}
