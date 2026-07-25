import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/shop/ProductCard";
import { catalogApi } from "@/lib/catalog-api";
import { queryKeys } from "@/lib/query-keys";

type CategorySort = "newest" | "popular" | "price-asc" | "price-desc" | "name-asc" | "name-desc";

const flattenCategories = (categories: Awaited<ReturnType<typeof catalogApi.categories>>["categories"]) => {
  const result: typeof categories = [];
  const visit = (entries: typeof categories) => {
    for (const entry of entries) {
      result.push(entry);
      visit(entry.children ?? []);
    }
  };
  visit(categories);
  return result;
};

export const Route = createFileRoute("/category/$slug")({
  head: ({ params }) => ({
    meta: [
      {
        title: `${params.slug.charAt(0).toUpperCase() + params.slug.slice(1)} - BALY by Bilal Garments EST 2001.`,
      },
      {
        name: "description",
        content: `Shop the ${params.slug} collection at BALY by Bilal Garments EST 2001.`,
      },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const [sort, setSort] = useState<CategorySort>("newest");
  const [page, setPage] = useState(1);
  const { data: bootstrap } = useQuery({
    queryKey: queryKeys.catalog.bootstrap,
    queryFn: catalogApi.bootstrap,
  });
  const allCategories = flattenCategories(bootstrap?.categories ?? []);
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.catalog.productsList({ category: slug, inStock: true, sort }),
    queryFn: async () => catalogApi.products({ category: slug, inStock: true, sort }),
    enabled: Boolean(bootstrap),
  });

  const products = useMemo(() => data?.products ?? [], [data?.products]);
  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(products.length / pageSize));
  const visibleProducts = useMemo(() => products.slice((page - 1) * pageSize, page * pageSize), [page, products]);

  useEffect(() => {
    setPage(1);
  }, [slug, sort]);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const category = allCategories.find((entry) => entry.slug === slug);
  if (!category && bootstrap) {
    throw notFound();
  }

  if (!category) {
    return null;
  }

  return (
    <div className="container-bg py-12 md:py-20">
      <div className="mb-10 border-b border-border pb-8">
        <div className="mb-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">Collection</div>
        <h1 className="display text-5xl md:text-7xl">{category.name}.</h1>
        <p className="mt-3 text-muted-foreground">{data?.meta.total ?? products.length} pieces curated for you.</p>
      </div>
      <div className="mb-6 flex justify-end">
        <label className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
          Sort
          <select aria-label="Sort category products" value={sort} onChange={(event) => setSort(event.target.value as CategorySort)} className="border border-border bg-background px-3 py-2 text-xs uppercase tracking-widest text-foreground">
            <option value="newest">Newest</option>
            <option value="popular">Popular</option>
            <option value="price-asc">Price up</option>
            <option value="price-desc">Price down</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
          </select>
        </label>
      </div>
      {isLoading ? (
        <div className="py-24 text-center text-muted-foreground">Loading the collection...</div>
      ) : products.length === 0 ? (
        <div className="py-24 text-center text-muted-foreground">Nothing here yet. Check back soon.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 md:gap-8">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {pageCount > 1 && (
            <div className="mt-10 flex items-center justify-center gap-4 text-xs uppercase tracking-widest">
              <button type="button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="border border-border px-4 py-3 disabled:cursor-not-allowed disabled:opacity-40">
                Previous
              </button>
              <span className="text-muted-foreground">
                Page {page} of {pageCount}
              </span>
              <button type="button" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="border border-border px-4 py-3 disabled:cursor-not-allowed disabled:opacity-40">
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
