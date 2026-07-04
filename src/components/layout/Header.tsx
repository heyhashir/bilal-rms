import { Link, useRouterState } from "@tanstack/react-router";
import { ShoppingBag, Heart, User, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { useCart, useWishlist } from "@/store/cart";
import { useAuth } from "@/store/auth";
import { site, categories } from "@/config/site";

const nav = [
  { to: "/shop", label: "Shop" },
  { to: "/category/men", label: "Men" },
  { to: "/category/women", label: "Women" },
  { to: "/category/kids", label: "Kids" },
  { to: "/category/accessories", label: "Accessories" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const cartCount = useCart((s) => s.lines.reduce((a, l) => a + l.qty, 0));
  const wishCount = useWishlist((s) => s.ids.length);
  const user = useAuth((s) => s.users.find((u) => u.id === s.currentId) ?? null);
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 transition-colors">
      <div className="bg-primary text-primary-foreground text-[11px] tracking-[0.2em] uppercase">
        <div className="container-bg overflow-hidden py-2">
          <div className="marquee">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex gap-12">
                <span>Free shipping over Rs. {site.shipping.freeAbove.toLocaleString()}</span>
                <span>· New drop · AW26 collection live now ·</span>
                <span>COD available across Pakistan</span>
                <span>· Easy 7-day returns ·</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container-bg flex h-16 items-center justify-between gap-6">
        <button
          className="md:hidden -ml-2 p-2"
          onClick={() => setOpen((v) => !v)}
          aria-label="Open menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link to="/" className="display text-xl tracking-tight">
          BILAL<span className="text-accent">.</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm">
          {nav.map((n) => {
            const active = path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`relative uppercase tracking-[0.14em] text-[11.5px] font-medium transition-colors duration-300 after:pointer-events-none after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-px after:bg-current after:origin-left after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.22,1,0.36,1)] ${
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
          <Link to="/search" className="p-2.5 transition-colors duration-300 hover:text-accent" aria-label="Search">
            <Search className="h-[17px] w-[17px]" />
          </Link>
          <Link
            to={user ? "/account" : "/login"}
            className="p-2.5 transition-colors duration-300 hover:text-accent"
            aria-label="Account"
          >
            <User className="h-[17px] w-[17px]" />
          </Link>
          <Link to="/wishlist" className="relative p-2.5 transition-colors duration-300 hover:text-accent" aria-label="Wishlist">
            <Heart className="h-[17px] w-[17px]" />
            {wishCount > 0 && <Badge n={wishCount} />}
          </Link>
          <Link to="/cart" className="relative p-2.5 transition-colors duration-300 hover:text-accent" aria-label="Cart">
            <ShoppingBag className="h-[17px] w-[17px]" />
            {cartCount > 0 && <Badge n={cartCount} />}
          </Link>
        </div>
      </div>

      <div
        className={`md:hidden overflow-hidden border-t border-border transition-[max-height,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="container-bg flex flex-col py-2">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="py-3 text-sm uppercase tracking-[0.16em] border-b border-border/50 last:border-0 transition-colors hover:text-accent"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
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
  return (
    <footer className="mt-24 border-t border-border bg-secondary">
      <div className="container-bg py-16 grid gap-12 md:grid-cols-4">
        <div>
          <div className="display text-2xl mb-3">
            BILAL<span className="text-accent">.</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            {site.description}
          </p>
        </div>
        <FooterCol
          title="Shop"
          items={categories.map((c) => ({ to: `/category/${c.slug}`, label: c.name }))}
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
          <h4 className="text-xs uppercase tracking-widest mb-3 font-semibold">Newsletter</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Get 10% off your first order.
          </p>
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
            <button className="bg-primary text-primary-foreground px-4 text-xs uppercase tracking-widest">
              Join
            </button>
          </form>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-bg py-5 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {site.name}. All rights reserved.</span>
          <span>{site.address} · {site.email}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: { to: string; label: string }[] }) {
  return (
    <div>
      <h4 className="text-xs uppercase tracking-widest mb-3 font-semibold">{title}</h4>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i.to}>
            <Link to={i.to} className="hover:text-foreground">{i.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
