import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { accountApi } from "@/lib/account-api";
import { queryKeys } from "@/lib/query-keys";
import { formatPrice } from "@/lib/format";
import { useAuth } from "@/store/auth";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "My account - Bilal Garments" }] }),
  component: Account,
});

function Account() {
  const { user, isPending } = useProtectedUser();
  const auth = useAuth();
  const navigate = useNavigate();
  const { data: orders = [] } = useQuery({
    queryKey: queryKeys.account.orders,
    queryFn: async () => (await accountApi.orders()).orders,
    enabled: Boolean(user),
  });

  if (isPending || !user) return null;

  return (
    <div className="container-bg py-12 md:py-16">
      <div className="mb-10 flex items-end justify-between border-b border-border pb-6">
        <div>
          <div className="mb-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">Account</div>
          <h1 className="display text-4xl md:text-5xl">Hi, {user.name.split(" ")[0]}.</h1>
          <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex gap-3">
          {user.role === "admin" && (
            <Link to="/admin" className="border border-foreground px-5 py-2.5 text-xs uppercase tracking-widest">Admin</Link>
          )}
          <button
            onClick={async () => {
              await auth.logout();
              void navigate({ to: "/" });
            }}
            className="border border-foreground px-5 py-2.5 text-xs uppercase tracking-widest"
          >
            Sign out
          </button>
        </div>
      </div>

      <h2 className="display mb-5 text-2xl">Order history</h2>
      {orders.length === 0 ? (
        <div className="bg-secondary p-10 text-center">
          <p className="mb-4 text-muted-foreground">You haven't placed any orders yet.</p>
          <Link to="/shop" className="inline-block bg-primary px-6 py-3 text-xs uppercase tracking-widest text-primary-foreground">Start shopping</Link>
        </div>
      ) : (
        <div className="border border-border">
          {orders.map((order) => (
            <div key={order.id} className="flex flex-wrap items-center gap-4 border-b border-border p-4 text-sm last:border-b-0">
              <div className="w-32">
                <div className="font-semibold">{order.id}</div>
                <div className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="min-w-0 flex-1 text-xs text-muted-foreground">
                {order.lines.length} item{order.lines.length > 1 ? "s" : ""} · {order.payment.toUpperCase()}
              </div>
              <span className={`px-2 py-1 text-[10px] uppercase tracking-widest ${
                order.status === "delivered" ? "bg-accent text-accent-foreground" :
                order.status === "cancelled" ? "bg-sale text-primary-foreground" :
                "bg-secondary"
              }`}>{order.status}</span>
              <div className="font-semibold">{formatPrice(order.total)}</div>
              <Link
                to="/invoice/$orderNumber"
                params={{ orderNumber: order.id }}
                search={{ token: order.token }}
                className="text-xs uppercase tracking-widest underline"
              >
                Invoice
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
