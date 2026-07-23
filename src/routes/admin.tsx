import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useProtectedUser } from "@/hooks/use-protected-user";
import {
  LayoutDashboard, Package, Tag, ShoppingBag, Users, ArrowLeft, Settings as SettingsIcon,
  Award, Boxes, Undo2, RotateCcw, ScanLine, ReceiptText, HandCoins, Upload,
  BarChart3,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Bilal Garments" }] }),
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
      { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
      { to: "/admin/imports", label: "Imports", icon: Upload },
    ],
  },
] as const;

function AdminLayout() {
  const { user, isPending } = useProtectedUser({ role: "admin" });
  const path = useRouterState({ select: (r) => r.location.pathname });

  if (isPending || !user || user.role !== "admin") return null;

  return (
    <div className="container-bg py-8 md:py-12">
      <div className="flex items-end justify-between border-b border-border pb-5 mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Retail management</div>
          <h1 className="display text-3xl md:text-4xl">Control room.</h1>
        </div>
        <Link to="/" className="text-xs uppercase tracking-widest inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to site
        </Link>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-8">
        <aside>
          <nav className="lg:sticky lg:top-24 flex lg:flex-col gap-6 overflow-x-auto pb-3 lg:pb-0">
            {groups.map((g) => (
              <div key={g.label} className="shrink-0">
                <div className="hidden lg:block text-[10px] uppercase tracking-[0.3em] text-muted-foreground px-3 mb-2">{g.label}</div>
                <div className="flex lg:flex-col gap-1">
                  {g.items.map((i) => {
                    const active = "exact" in i && i.exact ? path === i.to : path === i.to || path.startsWith(i.to + "/");
                    return (
                      <Link
                        key={i.to}
                        to={i.to}
                        className={`flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-widest border whitespace-nowrap transition-colors ${
                          active ? "bg-primary text-primary-foreground border-primary" : "border-transparent hover:bg-secondary"
                        }`}
                      >
                        <i.icon className="h-3.5 w-3.5" /> {i.label}
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
