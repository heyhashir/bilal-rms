import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, X } from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { catalogApi } from "@/lib/catalog-api";
import { queryKeys } from "@/lib/query-keys";

export const Route = createFileRoute("/sale")({
  head: () => ({
    meta: [
      { title: "Sale - BALY by Bilal Garments EST 2001." },
      { name: "description", content: "Live sale markdowns pulled directly from the active catalog." },
    ],
  }),
  component: SalePage,
});

function SalePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const saleQuery = useQuery({
    queryKey: ["catalog", "sale-products"],
    queryFn: catalogApi.saleProducts,
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.catalog.categories,
    queryFn: catalogApi.categories,
  });

  const rawProducts = saleQuery.data?.products;
  const products = useMemo(() => rawProducts ?? [], [rawProducts]);
  const categories = categoriesQuery.data?.categories ?? [];

  const availableCategorySlugs = useMemo(() => {
    return new Set(products.map((p) => p.category));
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

  return (
    <div className="container-bg py-12 md:py-20">
      <div className="mb-8 border-b border-border pb-8">
        <div className="mb-3 text-xs uppercase tracking-[0.3em] text-accent">Sale</div>
        <h1 className="display text-5xl md:text-7xl">Marked down now.</h1>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <p className="text-muted-foreground">
            {filteredProducts.length} live sale item{filteredProducts.length === 1 ? "" : "s"}
            {selectedCategory && ` in ${categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory}`}.
          </p>
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="flex items-center gap-2 border border-border px-3 py-1.5 text-xs uppercase tracking-widest md:hidden"
          >
            <Filter className="h-3.5 w-3.5" /> Filter Category
          </button>
        </div>
      </div>

      {/* Desktop category pills */}
      <div className="mb-8 hidden flex-wrap gap-2 md:flex">
        <button
          onClick={() => setSelectedCategory("")}
          className={`px-4 py-2 text-xs uppercase tracking-widest transition-colors ${
            !selectedCategory ? "bg-primary text-primary-foreground" : "border border-border bg-background hover:bg-secondary"
          }`}
        >
          All Sale Items ({products.length})
        </button>
        {categories
          .filter((c) => availableCategorySlugs.has(c.slug))
          .map((cat) => {
            const count = products.filter((p) => p.category === cat.slug).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-4 py-2 text-xs uppercase tracking-widest transition-colors ${
                  selectedCategory === cat.slug
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background hover:bg-secondary"
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
      </div>

      {/* Mobile Category Popup / Bottom Sheet */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 md:hidden">
          <div className="w-full max-h-[80vh] overflow-y-auto bg-background p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-semibold uppercase tracking-widest">Select Category</h3>
              <button onClick={() => setMobileFilterOpen(false)} className="p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-2">
              <button
                onClick={() => {
                  setSelectedCategory("");
                  setMobileFilterOpen(false);
                }}
                className={`w-full py-3 text-left text-xs uppercase tracking-widest ${
                  !selectedCategory ? "font-bold text-accent" : "text-foreground"
                }`}
              >
                All Categories ({products.length})
              </button>
              {categories
                .filter((c) => availableCategorySlugs.has(c.slug))
                .map((cat) => {
                  const count = products.filter((p) => p.category === cat.slug).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.slug);
                        setMobileFilterOpen(false);
                      }}
                      className={`w-full border-t border-border/50 py-3 text-left text-xs uppercase tracking-widest ${
                        selectedCategory === cat.slug ? "font-bold text-accent" : "text-foreground"
                      }`}
                    >
                      {cat.name} ({count})
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {saleQuery.isLoading ? (
        <div className="py-24 text-center text-muted-foreground">Loading sale items...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-24 text-center text-muted-foreground">No sale items match your filter.</div>
      ) : (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 md:gap-8">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
