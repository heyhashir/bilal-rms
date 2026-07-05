import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/store/auth";
import {
  LayoutDashboard, Package, Tag, ShoppingBag, Users, Ruler, ArrowLeft, Hash, Settings as SettingsIcon,
  Award, Boxes, Truck, ClipboardList, Undo2, BadgePercent, Ticket, UserCog, ShieldCheck, BarChart3, Image as ImageIcon, Bell, Activity, RotateCcw,
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
      { to: "/admin/activity", label: "Activity", icon: Activity },
      { to: "/admin/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Catalog",
    items: [
      { to: "/admin/products", label: "Products", icon: Package },
      { to: "/admin/categories", label: "Categories", icon: Tag },
      { to: "/admin/brands", label: "Brands", icon: Award },
      { to: "/admin/size-charts", label: "Size charts", icon: Ruler },
    ],
  },
  {
    label: "Inventory",
    items: [
      { to: "/admin/inventory", label: "Inventory", icon: Boxes },
      { to: "/admin/suppliers", label: "Suppliers", icon: Truck },
      { to: "/admin/purchase-orders", label: "Purchase orders", icon: ClipboardList },
    ],
  },
  {
    label: "Sales",
    items: [
      { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
      { to: "/admin/returns", label: "Returns", icon: Undo2 },
      { to: "/admin/refunds", label: "Refunds", icon: RotateCcw },
      { to: "/admin/discounts", label: "Discounts", icon: BadgePercent },
      { to: "/admin/coupons", label: "Coupons", icon: Ticket },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/admin/customers", label: "Customers", icon: Users },
      { to: "/admin/employees", label: "Employees", icon: UserCog },
      { to: "/admin/roles", label: "Roles", icon: ShieldCheck },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/admin/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Website",
    items: [
      { to: "/admin/cms", label: "CMS", icon: ImageIcon },
      { to: "/admin/seo", label: "SEO / Tags", icon: Hash },
      { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
] as const;

function AdminLayout() {
  const auth = useAuth();
  const user = auth.users.find((u) => u.id === auth.currentId) ?? null;
  const nav = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    if (!user) nav({ to: "/login" });
    else if (user.role !== "admin") nav({ to: "/" });
  }, [user, nav]);

  if (!user || user.role !== "admin") return null;

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
