import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Flame, Sparkles, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/shop/ProductCard";
import type { Product } from "@/lib/catalog-types";
import { isDiscountedProduct } from "@/lib/format";

interface TabOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  filter: (products: Product[]) => Product[];
  viewAllLink: { to: string; params?: Record<string, string> };
}

export function TabbedProductShowcase({ products }: { products: Product[] }) {
  const [activeTab, setActiveTab] = useState("trending");

  const tabs: TabOption[] = useMemo(
    () => [
      {
        id: "trending",
        label: "Trending Now",
        icon: <Flame className="h-3.5 w-3.5 text-accent" />,
        filter: (items) => items.filter((p) => p.trending || p.featured).slice(0, 8),
        viewAllLink: { to: "/shop" },
      },
      {
        id: "women",
        label: "Women's Edit",
        filter: (items) => items.filter((p) => p.category === "women" || p.category === "women-unstitched" || p.category === "women-pret").slice(0, 8),
        viewAllLink: { to: "/category/$slug", params: { slug: "women" } },
      },
      {
        id: "men",
        label: "Men's Collection",
        filter: (items) => items.filter((p) => p.category === "men" || p.category === "polos" || p.category === "shirts").slice(0, 8),
        viewAllLink: { to: "/category/$slug", params: { slug: "men" } },
      },
      {
        id: "kids",
        label: "Kids & Teens",
        filter: (items) => items.filter((p) => p.category === "kids").slice(0, 8),
        viewAllLink: { to: "/category/$slug", params: { slug: "kids" } },
      },
      {
        id: "sale",
        label: "Special Markdowns",
        icon: <Tag className="h-3.5 w-3.5 text-sale" />,
        filter: (items) => items.filter((p) => isDiscountedProduct(p)).slice(0, 8),
        viewAllLink: { to: "/sale" },
      },
    ],
    [],
  );

  const currentTabObj = tabs.find((t) => t.id === activeTab) ?? tabs[0];
  const displayedProducts = useMemo(() => {
    const filtered = currentTabObj.filter(products);
    // If specific tab filter is empty, fallback to taking up to 8 available products
    return filtered.length > 0 ? filtered : products.slice(0, 8);
  }, [currentTabObj, products]);

  return (
    <section className="container-bg py-16 md:py-24 border-t border-border/60" aria-label="Product Showcase">
      {/* Header & Tabs */}
      <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:items-end mb-10 md:mb-12">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-accent mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Curated Arrivals
          </div>
          <h2 className="display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Latest In Store
          </h2>
        </div>

        {/* Tab Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 bg-secondary/70 p-1.5 rounded-none border border-border/80">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition-all duration-300 ${
                  isActive
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4-Column Product Grid */}
      {displayedProducts.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          No products currently available in this section.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4 md:gap-8">
          {displayedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Bottom Action */}
      <div className="mt-12 text-center">
        <Link
          to={currentTabObj.viewAllLink.to}
          params={currentTabObj.viewAllLink.params}
          className="inline-flex items-center gap-2 border-2 border-foreground bg-transparent px-8 py-3.5 text-xs font-bold uppercase tracking-[0.2em] transition hover:bg-foreground hover:text-background"
        >
          View All {currentTabObj.label} <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
