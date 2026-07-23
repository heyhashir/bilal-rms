import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useProtectedUser } from "@/hooks/use-protected-user";
import {
  LayoutDashboard,
  Package,
  Tag,
  ShoppingBag,
  Users,
  ArrowLeft,
  Settings as SettingsIcon,
  Award,
  Boxes,
  Undo2,
  RotateCcw,
  ScanLine,
  ReceiptText,
  HandCoins,
  Upload,
  BarChart3,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin - BALY by Bilal Garments EST 2001." }] }),
  component: AdminLayout,
});

const groups = [
  {
    label: "Overview",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { to: "/admin/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Catalog",
    items: [
      { to: "/admin/products", label: "Products", icon: Package },
      { to: "/admin/categories", label: "Categories", icon: Tag },
      { to: "/admin/brands", label: "Brands", icon: Award },
    ],
  },
  {
    label: "Inventory",
    items: [
      { to: "/admin/inventory", label: "Inventory", icon: Boxes },
      { to: "/admin/suppliers", label: "Suppliers", icon: Boxes },
    ],
  },
  {
    label: "Sales",
    items: [
      { to: "/admin/orders", label: "Online orders", icon: ShoppingBag },
      { to: "/pos", label: "POS terminal", icon: ScanLine },
      { to: "/admin/pos-sales", label: "POS sales", icon: ReceiptText },
      { to: "/admin/returns", label: "Returns", icon: Undo2 },
      { to: "/admin/refunds", label: "Refunds", icon: RotateCcw },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/admin/customers", label: "Customers", icon: Users },
      { to: "/admin/employees", label: "Employees", icon: Users },
      { to: "/admin/commissions", label: "Commissions", icon: HandCoins },
    ],
  },
  {
    label: "Store",
    items: [
      { to: "/admin/roles", label: "Staff access", icon: Users },
      { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
      { to: "/admin/imports", label: "Imports", icon: Upload },
    ],
  },
] as const;

function AdminLayout() {
  const { user, isPending } = useProtectedUser({ role: ["admin", "manager", "staff"] });
  const path = useRouterState({ select: (router) => router.location.pathname });

  if (isPending || !user) {
    return null;
  }

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (user.role === "admin") {
          return true;
        }

        if (user.role === "manager") {
          return !["/admin/reports", "/admin/commissions", "/admin/roles", "/admin/settings", "/admin/imports"].includes(item.to);
        }

        return ["/admin/products", "/admin/categories", "/admin/brands", "/pos"].includes(item.to);
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="container-bg py-8 md:py-12">
      <div className="mb-8 flex items-end justify-between border-b border-border pb-5">
        <div>
          <div className="mb-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">Retail management</div>
          <h1 className="display text-3xl md:text-4xl">Control room.</h1>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to site
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside>
          <nav className="flex gap-6 overflow-x-auto pb-3 lg:sticky lg:top-24 lg:flex-col lg:pb-0">
            {visibleGroups.map((group) => (
              <div key={group.label} className="shrink-0">
                <div className="mb-2 hidden px-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground lg:block">
                  {group.label}
                </div>
                <div className="flex gap-1 lg:flex-col">
                  {group.items.map((item) => {
                    const active = "exact" in item && item.exact ? path === item.to : path === item.to || path.startsWith(item.to + "/");
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`flex items-center gap-2 whitespace-nowrap border px-3 py-2 text-xs uppercase tracking-widest transition-colors ${
                          active ? "border-primary bg-primary text-primary-foreground" : "border-transparent hover:bg-secondary"
                        }`}
                      >
                        <item.icon className="h-3.5 w-3.5" /> {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>
        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
