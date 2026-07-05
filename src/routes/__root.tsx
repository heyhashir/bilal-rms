import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { Header, Footer } from "@/components/layout/Header";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="text-center">
        <h1 className="display text-7xl">404</h1>
        <p className="mt-2 text-muted-foreground">This page doesn't exist.</p>
        <Link to="/" className="mt-6 inline-block bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-widest">
          Back to home
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Bilal Garments — Bold Modern Fashion" },
      { name: "description", content: "Discover the AW26 collection. Bold, modern clothing made in Pakistan." },
      { property: "og:title", content: "Bilal Garments — Bold Modern Fashion" },
      { property: "og:description", content: "Discover the AW26 collection. Bold, modern clothing made in Pakistan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Bilal Garments — Bold Modern Fashion" },
      { name: "twitter:description", content: "Discover the AW26 collection. Bold, modern clothing made in Pakistan." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2ef76e5c-73e7-400d-b978-1802b5c660fd/id-preview-c51d2dfd--e94f0bfe-1f11-4533-a11c-247bcca9847d.lovable.app-1783143475853.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2ef76e5c-73e7-400d-b978-1802b5c660fd/id-preview-c51d2dfd--e94f0bfe-1f11-4533-a11c-247bcca9847d.lovable.app-1783143475853.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <Toaster />
    </>
  );
}
