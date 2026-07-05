import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { useCatalog } from "@/store/catalog";
import { ProductCard } from "@/components/shop/ProductCard";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "Search — Bilal Garments" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q : "" }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = useSearch({ from: "/search" });
  const [term, setTerm] = useState(q);
  const products = useCatalog((s) => s.products);

  const results = term.trim()
    ? products.filter((p) =>
        `${p.name} ${p.description} ${p.category} ${p.tags.join(" ")}`.toLowerCase().includes(term.toLowerCase()),
      )
    : [];

  return (
    <div className="container-bg py-12 md:py-16">
      <div className="border-b border-border pb-6 mb-8">
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Search</div>
        <h1 className="display text-4xl md:text-5xl mb-6">Find your piece.</h1>
        <div className="relative max-w-xl">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search products, categories, tags…"
            className="w-full pl-11 pr-4 py-4 border border-border bg-background text-sm outline-none focus:border-foreground"
          />
        </div>
      </div>

      {!term.trim() ? (
        <p className="text-muted-foreground text-sm">Start typing to see results across the collection.</p>
      ) : results.length === 0 ? (
        <div className="bg-secondary p-12 text-center">
          <p className="text-muted-foreground mb-4">No matches for “{term}”.</p>
          <Link to="/shop" className="inline-block bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-widest">Browse everything</Link>
        </div>
      ) : (
        <>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-6">{results.length} result{results.length === 1 ? "" : "s"}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-8">
            {results.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </>
      )}
    </div>
  );
}
