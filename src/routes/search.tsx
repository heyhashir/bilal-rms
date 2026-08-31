import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, Sparkles } from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { catalogApi } from "@/lib/catalog-api";
import { queryKeys } from "@/lib/query-keys";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "Search - Bilal Garments" }] }),
  validateSearch: (search: Record<string, unknown>) => ({ q: typeof search.q === "string" ? search.q : "" }),
  component: SearchPage,
});

const popularSearches = ["Jeans", "T-Shirt", "Shirt", "Trousers", "Jacket", "Hoodie"];

function SearchPage() {
  const { q } = useSearch({ from: "/search" });
  const [term, setTerm] = useState(q);
  const query = term.trim();

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: queryKeys.catalog.productsList({ search: query, inStock: true }),
    queryFn: async () => catalogApi.products({ search: query, inStock: true, sort: "popular" }),
    enabled: query.length > 0,
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.catalog.categories,
    queryFn: catalogApi.categories,
  });

  const results = data?.products ?? [];
  const categories = categoriesQuery.data?.categories ?? [];

  return (
    <div className="container-bg py-12 md:py-16">
      <div className="mb-8 border-b border-border pb-6">
        <div className="mb-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">Quick Find</div>
        <h1 className="display mb-4 text-4xl md:text-5xl">Find your piece.</h1>
        <p className="mb-6 text-xs text-muted-foreground">
          Instant multi-field search across product names, SKU numbers, 1D/2D barcodes, sizes, colors, and categories.
        </p>
        <div className="relative max-w-xl">
          <SearchIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search by name, SKU, barcode, size, color..."
            className="w-full border border-border bg-background py-4 pl-11 pr-4 text-sm outline-none focus:border-foreground"
          />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1 font-semibold uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> Popular:
          </span>
          {popularSearches.map((pop) => (
            <button
              key={pop}
              onClick={() => setTerm(pop)}
              className="border border-border bg-background px-2.5 py-1 text-xs hover:border-foreground transition-colors"
            >
              {pop}
            </button>
          ))}
          {categories.slice(0, 4).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setTerm(cat.name)}
              className="border border-border/60 bg-secondary/50 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {!query ? (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">Start typing to see results across the collection.</p>
          {categories.length > 0 && (
            <div>
              <div className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Browse by Category</div>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to="/category/$slug"
                    params={{ slug: cat.slug }}
                    className="border border-border bg-background px-4 py-2 text-xs uppercase tracking-widest hover:bg-secondary transition-colors"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : isError ? (
        <div className="bg-secondary p-12 text-center" role="alert">
          <p className="font-medium">Search is temporarily unavailable.</p>
          <p className="mt-2 text-sm text-muted-foreground">Your search was not treated as an empty result.</p>
          <button onClick={() => void refetch()} className="mt-4 text-xs uppercase tracking-widest underline underline-offset-4">
            Try again
          </button>
        </div>
      ) : isFetching && results.length === 0 ? (
        <div className="py-24 text-center text-muted-foreground">Searching the catalog...</div>
      ) : results.length === 0 ? (
        <div className="bg-secondary p-12 text-center">
          <p className="mb-4 text-muted-foreground">No matches for "{term}".</p>
          <Link to="/shop" className="inline-block bg-primary px-6 py-3 text-xs uppercase tracking-widest text-primary-foreground">
            Browse everything
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6 text-xs uppercase tracking-widest text-muted-foreground">
            {results.length} result{results.length === 1 ? "" : "s"} found for "{term}"
          </div>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-8">
            {results.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
