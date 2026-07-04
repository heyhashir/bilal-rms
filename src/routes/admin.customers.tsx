import { createFileRoute } from "@tanstack/react-router";
import { useAuth, useOrders } from "@/store/auth";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/admin/customers")({
  component: AdminCustomers,
});

function AdminCustomers() {
  const users = useAuth((s) => s.users);
  const orders = useOrders((s) => s.orders);

  return (
    <div>
      <h2 className="display text-2xl mb-5">Customers ({users.length})</h2>
      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-secondary text-xs uppercase tracking-widest">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Orders</th>
              <th className="text-left p-3">Spend</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const my = orders.filter((o) => o.userId === u.id || o.email === u.email);
              const total = my.reduce((a, o) => a + o.total, 0);
              return (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3 text-xs uppercase tracking-widest">{u.role}</td>
                  <td className="p-3">{my.length}</td>
                  <td className="p-3 font-semibold">{formatPrice(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
