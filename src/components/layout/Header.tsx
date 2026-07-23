import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Heart, User, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { catalogApi } from "@/lib/catalog-api";
import type { Category, StorefrontSettings } from "@/lib/catalog-types";
import { queryKeys } from "@/lib/query-keys";
import { useCart, useWishlist } from "@/store/cart";
import { site } from "@/config/site";

const navTail = [
  { to: "/sale", label: "Sale" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

const fallbackSettings: StorefrontSettings = {
  id: "fallback",
  name: site.name,
  logoPrimaryText: "BALY",
  logoSecondaryText: "By Bilal Garments",
  logoTertiaryText: "EST 2001",
  promoRibbonText: `Free shipping over Rs. ${site.shipping.freeAbove.toLocaleString()}\nNew drop\nAW26 collection live now\nCOD available across Pakistan\nEasy 7-day returns`,
  promoRibbonItems: [
    `Free shipping over Rs. ${site.shipping.freeAbove.toLocaleString()}`,
    "New drop",
    "AW26 collection live now",
    "COD available across Pakistan",
    "Easy 7-day returns",
  ],
  tagline: site.tagline,
  description: site.description,
  email: site.email,
  phone: site.phone,
  address: site.address,
  currency: site.currency,
  currencySymbol: site.currencySymbol,
  invoicePrefix: "BALY",
  receiptPrefix: "BALY",
  thermalHeader: "",
  thermalFooter: "",
  barcodePrefix: "BALY",
  qrPrefix: "BALYQ",
  instagram: site.social.instagram,
  facebook: site.social.facebook,
  tiktok: site.social.tiktok,
  metaTitle: site.name,
  metaDescription: site.description,
};

export function Header() {
  const [open, setOpen] = useState(false);
  const cartCount = useCart((s) => s.lines.reduce((a, l) => a + l.qty, 0));
  const wishCount = useWishlist((s) => s.ids.length);
  const { data: user } = useCurrentUser();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const settingsQuery = useQuery({
    queryKey: queryKeys.catalog.settings,
    queryFn: catalogApi.settings,
  });
  const categoriesQuery = useQuery({
    queryKey: queryKeys.catalog.categories,
    queryFn: catalogApi.categories,
  });
  const settings = settingsQuery.data?.settings ?? fallbackSettings;
  const promoItems = settings.promoRibbonItems.length > 0 ? settings.promoRibbonItems : fallbackSettings.promoRibbonItems;
  const categories = categoriesQuery.data?.categories ?? [];

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 transition-colors">
      <div className="bg-primary text-[11px] uppercase tracking-[0.2em] text-primary-foreground">
        <div className="container-bg overflow-hidden py-2">
          <div className="marquee">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className={`marquee-copy ${i === 1 ? "marquee-copy--duplicate" : ""}`}
                aria-hidden={i === 1}
              >
                {promoItems.map((item, index) => (
                  <span key={`${i}-${index}-${item}`}>
                    {index > 0 ? "· " : ""}
                    {item}
                    {index < promoItems.length - 1 ? " ·" : ""}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container-bg flex min-h-[84px] items-center justify-between gap-4 py-3">
        <button
          className="-ml-2 p-2 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Open menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link to="/" className="shrink-0 text-foreground">
          <BrandMark settings={settings} variant="header" />
        </Link>

        <nav className="hidden items-center gap-7 text-sm md:flex">
          <Link
            to="/shop"
            className={`relative text-[11.5px] font-medium uppercase tracking-[0.14em] transition-colors duration-300 after:pointer-events-none after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-px after:origin-left after:bg-current after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.22,1,0.36,1)] ${
              path.startsWith("/shop")
                ? "text-foreground after:scale-x-100"
                : "text-muted-foreground hover:text-foreground after:scale-x-0 hover:after:scale-x-100"
            }`}
          >
            Shop
          </Link>
          {categories.map((category) => (
            <CategoryNavItem key={category.id} category={category} path={path} />
          ))}
          {navTail.map((n) => {
            const active = path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`relative text-[11.5px] font-medium uppercase tracking-[0.14em] transition-colors duration-300 after:pointer-events-none after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-px after:origin-left after:bg-current after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  active
                    ? "text-foreground after:scale-x-100"
                    : "text-muted-foreground hover:text-foreground after:scale-x-0 hover:after:scale-x-100"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-0.5">
          <Link
            to="/search"
            className="p-2.5 transition-colors duration-300 hover:text-accent"
            aria-label="Search"
          >
            <Search className="h-[17px] w-[17px]" />
          </Link>
          <Link
            to={user ? "/account" : "/login"}
            className="p-2.5 transition-colors duration-300 hover:text-accent"
            aria-label="Account"
          >
            <User className="h-[17px] w-[17px]" />
          </Link>
          <Link
            to="/wishlist"
            className="relative p-2.5 transition-colors duration-300 hover:text-accent"
            aria-label="Wishlist"
          >
            <Heart className="h-[17px] w-[17px]" />
            {wishCount > 0 && <Badge n={wishCount} />}
          </Link>
          <Link
            to="/cart"
            className="relative p-2.5 transition-colors duration-300 hover:text-accent"
            aria-label="Cart"
          >
            <ShoppingBag className="h-[17px] w-[17px]" />
            {cartCount > 0 && <Badge n={cartCount} />}
          </Link>
        </div>
      </div>

      <div
        className={`overflow-hidden border-t border-border transition-[max-height,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden ${
          open ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="container-bg flex flex-col py-2">
          <Link
            to="/shop"
            onClick={() => setOpen(false)}
            className="border-b border-border/50 py-3 text-sm uppercase tracking-[0.16em] transition-colors last:border-0 hover:text-accent"
          >
            Shop
          </Link>
          {categories.map((category) => (
            <div key={category.id} className="border-b border-border/50 py-3 last:border-0">
              <Link
                to="/category/$slug"
                params={{ slug: category.slug }}
                onClick={() => setOpen(false)}
                className="block text-sm uppercase tracking-[0.16em] transition-colors hover:text-accent"
              >
                {category.name}
              </Link>
              {category.children.length > 0 && (
                <div className="mt-2 flex flex-col gap-2 pl-4">
                  {category.children.map((child) => (
                    <Link
                      key={child.id}
                      to="/category/$slug"
                      params={{ slug: child.slug }}
                      onClick={() => setOpen(false)}
                      className="text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-accent"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          {navTail.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="border-b border-border/50 py-3 text-sm uppercase tracking-[0.16em] transition-colors last:border-0 hover:text-accent"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function BrandMark({ settings, variant }: { settings: StorefrontSettings; variant: "header" | "footer" }) {
  const isHeader = variant === "header";

  return (
    <span className={`inline-flex flex-col ${isHeader ? "leading-none" : "leading-[1.05]"}`}>
      <span className="flex items-end gap-2">
        <span
          className={`font-black uppercase tracking-[0.28em] text-primary ${
            isHeader ? "text-[1.6rem] sm:text-[1.8rem]" : "text-[1.55rem]"
          }`}
        >
          {settings.logoPrimaryText}
        </span>
        <span
          className={`mb-1 inline-block bg-accent ${
            isHeader ? "h-2.5 w-2.5 sm:h-3 sm:w-3" : "h-2.5 w-2.5"
          }`}
        />
      </span>
      <span
        className={`mt-1 font-semibold uppercase text-foreground/78 ${
          isHeader ? "text-[0.5rem] tracking-[0.34em] sm:text-[0.58rem]" : "text-[0.58rem] tracking-[0.34em]"
        }`}
      >
        {settings.logoSecondaryText}
      </span>
      <span
        className={`mt-1 font-medium uppercase text-accent ${
          isHeader ? "text-[0.46rem] tracking-[0.42em] sm:text-[0.52rem]" : "text-[0.52rem] tracking-[0.42em]"
        }`}
      >
        {settings.logoTertiaryText}
      </span>
    </span>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
      {n}
    </span>
  );
}

export function Footer() {
  const settingsQuery = useQuery({
    queryKey: queryKeys.catalog.settings,
    queryFn: catalogApi.settings,
  });
  const settings = settingsQuery.data?.settings ?? fallbackSettings;
  const categoriesQuery = useQuery({
    queryKey: queryKeys.catalog.categories,
    queryFn: catalogApi.categories,
  });
  const categories = categoriesQuery.data?.categories ?? [];

  return (
    <footer className="mt-24 border-t border-border bg-secondary">
      <div className="container-bg grid gap-12 py-16 md:grid-cols-4">
        <div>
          <BrandMark settings={settings} variant="footer" />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">{settings.description}</p>
        </div>
        <FooterCol
          title="Shop"
          items={categories.flatMap((category) => [
            { to: `/category/${category.slug}`, label: category.name },
            ...category.children.map((child) => ({ to: `/category/${child.slug}`, label: `${category.name} / ${child.name}` })),
          ])}
        />
        <FooterCol
          title="Help"
          items={[
            { to: "/about", label: "About" },
            { to: "/contact", label: "Contact" },
            { to: "/track-order", label: "Track order" },
            { to: "/faq", label: "FAQ" },
            { to: "/refund-policy", label: "Refund policy" },
            { to: "/privacy", label: "Privacy" },
            { to: "/terms", label: "Terms" },
          ]}
        />
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest">Newsletter</h4>
          <p className="mb-3 text-sm text-muted-foreground">Get 10% off your first order.</p>
          <form
            className="flex border border-border bg-background"
            onSubmit={(e) => {
              e.preventDefault();
              alert("Thanks for subscribing!");
              (e.currentTarget as HTMLFormElement).reset();
            }}
          >
            <input
              type="email"
              required
              placeholder="Email address"
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
            />
            <button className="bg-primary px-4 text-xs uppercase tracking-widest text-primary-foreground">
              Join
            </button>
          </form>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-bg flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} {settings.name}. All rights reserved.</span>
          <span>{settings.address} · {settings.email}</span>
        </div>
      </div>
    </footer>
  );
}

function CategoryNavItem({ category, path }: { category: Category; path: string }) {
  const active =
    path === `/category/${category.slug}` ||
    category.children.some((child) => path === `/category/${child.slug}`);

  return (
    <div className="group relative">
      <Link
        to="/category/$slug"
        params={{ slug: category.slug }}
        className={`relative text-[11.5px] font-medium uppercase tracking-[0.14em] transition-colors duration-300 after:pointer-events-none after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-px after:origin-left after:bg-current after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.22,1,0.36,1)] ${
          active
            ? "text-foreground after:scale-x-100"
            : "text-muted-foreground hover:text-foreground after:scale-x-0 hover:after:scale-x-100"
        }`}
      >
        {category.name}
      </Link>
      {category.children.length > 0 && (
        <div className="invisible absolute left-0 top-full z-30 min-w-[220px] translate-y-3 border border-border bg-background/95 p-3 opacity-0 shadow-2xl backdrop-blur transition duration-200 group-hover:visible group-hover:translate-y-1 group-hover:opacity-100">
          <div className="grid gap-2">
            {category.children.map((child) => (
              <Link
                key={child.id}
                to="/category/$slug"
                params={{ slug: child.slug }}
                className="text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
              >
                {child.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: { to: string; label: string }[] }) {
  return (
    <div>
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest">{title}</h4>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i.to}>
            <Link to={i.to} className="hover:text-foreground">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
