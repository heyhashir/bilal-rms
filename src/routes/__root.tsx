import { Outlet, createRootRoute, Link, useRouterState } from "@tanstack/react-router";
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

function RootComponent() {
  const hydrateAuth = useAuth((s) => s.hydrate);
  const expireSession = useAuth((s) => s.expireSession);
  const isDesktopWorkspace = isDesktopRuntime();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

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
      <main>
        <Outlet />
      </main>
      {!isDesktopWorkspace && <Footer />}
      <Toaster />
    </>
  );
}
