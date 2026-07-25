import { Outlet, createRootRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, LayoutDashboard, ScanLine } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Header, Footer } from "@/components/layout/Header";
import { Toaster } from "@/components/ui/sonner";
import { AUTH_EXPIRED_EVENT } from "@/lib/api";
import { isDesktopRuntime } from "@/lib/desktop-bridge";
import { useAuth } from "@/store/auth";
import { useCart } from "@/store/cart";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="text-center">
        <h1 className="display text-7xl">404</h1>
        <p className="mt-2 text-muted-foreground">This page doesn't exist.</p>
        <Link
          to="/"
          className="mt-6 inline-block bg-primary px-6 py-3 text-xs uppercase tracking-widest text-primary-foreground"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function DesktopRouteBar({ pathname }: { pathname: string }) {
  const navigate = useNavigate();
  const pageName =
    pathname
      .split("/")
      .filter(Boolean)
      .at(-1)
      ?.replaceAll("-", " ") ?? "Storefront";

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    void navigate({ to: "/admin" });
  };

  return (
    <div className="sticky top-0 z-[70] flex min-h-14 items-center justify-between gap-4 border-b border-border bg-background px-5 py-2 shadow-sm">
      <button
        type="button"
        onClick={goBack}
        aria-label="Back to previous screen"
        className="inline-flex items-center gap-2 border border-border px-4 py-2 text-xs uppercase tracking-widest hover:bg-secondary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <div className="hidden min-w-0 flex-1 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground md:block">
        {pageName}
      </div>
      <nav className="flex items-center gap-2" aria-label="Desktop workspace">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 border border-border px-4 py-2 text-xs uppercase tracking-widest hover:bg-secondary"
        >
          <LayoutDashboard className="h-4 w-4" />
          Management
        </Link>
        <Link
          to="/pos"
          className="inline-flex items-center gap-2 bg-primary px-4 py-2 text-xs uppercase tracking-widest text-primary-foreground"
        >
          <ScanLine className="h-4 w-4" />
          POS Terminal
        </Link>
      </nav>
    </div>
  );
}

function RootComponent() {
  const hydrateAuth = useAuth((s) => s.hydrate);
  const expireSession = useAuth((s) => s.expireSession);
  const isDesktopWorkspace = isDesktopRuntime();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const showDesktopRouteBar =
    isDesktopWorkspace && pathname !== "/login" && pathname !== "/pos" && !pathname.startsWith("/admin");

  useEffect(() => {
    // Keep desktop sign-in fast, but hydrate protected pages so refreshes and
    // direct navigation do not leave the admin/POS workspace blank.
    if (isDesktopWorkspace && pathname === "/login") {
      return;
    }

    void hydrateAuth();
  }, [hydrateAuth, isDesktopWorkspace, pathname]);

  useEffect(() => {
    let lastHandledAt = 0;

    const handleAuthExpired = () => {
      const now = Date.now();
      if (now - lastHandledAt < 1000) {
        return;
      }

      lastHandledAt = now;
      const hadSession = Boolean(useAuth.getState().user);
      expireSession();
      if (hadSession) {
        toast.error("Your session expired. Please sign in again.");
      }
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired as EventListener);

    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired as EventListener);
    };
  }, [expireSession]);

  useEffect(() => {
    // Buy Now is a temporary checkout-only line. Clear it after the user leaves
    // checkout, while preserving it during the product-to-checkout transition.
    if (pathname !== "/checkout") {
      useCart.getState().clearBuyNow();
    }
  }, [pathname]);

  return (
    <>
      {!isDesktopWorkspace && <Header />}
      {showDesktopRouteBar && <DesktopRouteBar pathname={pathname} />}
      <main>
        <Outlet />
      </main>
      {!isDesktopWorkspace && <Footer />}
      <Toaster />
    </>
  );
}
