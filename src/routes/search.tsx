import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { catalogApi } from "@/lib/catalog-api";
import { queryKeys } from "@/lib/query-keys";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "Search - Bilal Garments" }] }),
  validateSearch: (search: Record<string, unknown>) => ({ q: typeof search.q === "string" ? search.q : "" }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = useSearch({ from: "/search" });
  const [term, setTerm] = useState(q);
  const query = term.trim();
  const { data, isFetching } = useQuery({
    queryKey: queryKeys.catalog.productsList({ search: query, inStock: true }),
    queryFn: async () => catalogApi.products({ search: query, inStock: true, sort: "popular" }),
    enabled: query.length > 0,
  });
  const results = data?.products ?? [];

  return (
    <div className="container-bg py-12 md:py-16">
      <div className="mb-8 border-b border-border pb-6">
        <div className="mb-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">Search</div>
        <h1 className="display mb-6 text-4xl md:text-5xl">Find your piece.</h1>
        <div className="relative max-w-xl">
          <SearchIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search products, categories, tags..."
            className="w-full border border-border bg-background py-4 pl-11 pr-4 text-sm outline-none focus:border-foreground"
          />
        </div>
      </div>

      {!query ? (
        <p className="text-sm text-muted-foreground">Start typing to see results across the collection.</p>
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
            {results.length} result{results.length === 1 ? "" : "s"}
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
