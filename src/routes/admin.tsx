import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { isDesktopRuntime } from "@/lib/desktop-bridge";
import { useAuth } from "@/store/auth";
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
  LogOut,
  FileSpreadsheet,
  Calculator,
  Truck,
  BookOpen,
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
      { to: "/admin/reports", label: "P&L Reports", icon: BarChart3 },
      { to: "/admin/bill-wise", label: "Bill-Wise Sales", icon: FileSpreadsheet },
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
    label: "Inventory & Purchasing",
    items: [
      { to: "/admin/inventory", label: "Stock Manager", icon: Boxes },
      { to: "/admin/inventory-valuation", label: "Inventory Valuation", icon: Calculator },
      { to: "/admin/suppliers", label: "Vendors", icon: Truck },
      { to: "/admin/vendor-purchases", label: "Vendor Purchases", icon: ShoppingBag },
    ],
  },
  {
    label: "Sales & Billing",
    items: [
      { to: "/pos", label: "POS Terminal", icon: ScanLine },
      { to: "/admin/pos-sales", label: "POS Invoices", icon: ReceiptText },
      { to: "/admin/orders", label: "Online Orders", icon: ShoppingBag },
      { to: "/admin/returns", label: "Returns Log", icon: Undo2 },
      { to: "/admin/refunds", label: "Refunds Log", icon: RotateCcw },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/admin/ledger", label: "Expense Ledger", icon: BookOpen },
      { to: "/admin/commissions", label: "Commissions", icon: HandCoins },
    ],
  },
  {
    label: "People & Store",
    items: [
      { to: "/admin/employees", label: "Employees", icon: Users },
      { to: "/admin/customers", label: "Customers", icon: Users },
      { to: "/admin/roles", label: "Staff Access", icon: Users },
      { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
      { to: "/admin/imports", label: "CSV Imports", icon: Upload },
    ],
  },
] as const;

function AdminLayout() {
  const { user, isPending } = useProtectedUser({ role: ["admin", "manager", "staff"] });
  const navigate = useNavigate();
  const path = useRouterState({ select: (router) => router.location.pathname });
  const isDesktop = isDesktopRuntime();

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

        return ["/admin/inventory", "/admin/products", "/admin/categories", "/admin/brands", "/pos"].includes(item.to);
      }),
    }))
    .filter((group) => group.items.length > 0);

  const desktopShell = isDesktop;

  return (
    <div className={`container-bg ${desktopShell ? "flex h-dvh min-h-0 flex-col overflow-hidden py-6 md:py-8" : "py-8 md:py-12"}`}>
      <div className="mb-8 shrink-0 flex items-end justify-between border-b border-border pb-5">
        <div>
          <div className="mb-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">Retail Management System</div>
          <h1 className="display text-3xl md:text-4xl">Control room.</h1>
        </div>
        {isDesktop ? (
          <Link
            to="/pos"
            className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            <ScanLine className="h-3.5 w-3.5" /> Open POS terminal
          </Link>
        ) : (
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to site
          </Link>
        )}
        <button
          type="button"
          onClick={async () => {
            await useAuth.getState().logout();
            await navigate({ to: "/login" });
          }}
          className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>

      <div className={desktopShell ? "grid min-h-0 flex-1 grid-cols-[230px_minmax(0,1fr)] gap-6" : "grid gap-8 lg:grid-cols-[240px_1fr]"}>
        <aside className={desktopShell ? "min-h-0 overflow-y-auto pr-2" : undefined}>
          <nav className={desktopShell ? "flex flex-col gap-6 pb-6" : "flex gap-6 overflow-x-auto pb-3 lg:sticky lg:top-24 lg:flex-col lg:pb-0"}>
            {visibleGroups.map((group) => (
              <div key={group.label} className="shrink-0">
                <div className="mb-2 hidden px-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground lg:block font-semibold">
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
                          active ? "border-primary bg-primary text-primary-foreground font-semibold" : "border-transparent hover:bg-secondary"
                        }`}
                      >
                        <item.icon className="h-3.5 w-3.5 shrink-0" /> {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>
        <section className={desktopShell ? "min-w-0 min-h-0 overflow-y-auto pb-8 pr-2" : "min-w-0"}>
          <Outlet />
        </section>
      </div>
    </div>
  );
}
