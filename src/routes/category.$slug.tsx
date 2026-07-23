import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/shop/ProductCard";
import { catalogApi } from "@/lib/catalog-api";
import { queryKeys } from "@/lib/query-keys";

export const Route = createFileRoute("/category/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.charAt(0).toUpperCase() + params.slug.slice(1)} - BALY by Bilal Garments EST 2001.` },
      { name: "description", content: `Shop the ${params.slug} collection at BALY by Bilal Garments EST 2001.` },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data: bootstrap } = useQuery({
    queryKey: queryKeys.catalog.bootstrap,
    queryFn: catalogApi.bootstrap,
  });
  const allCategories = (bootstrap?.categories ?? []).flatMap((category) => [category, ...category.children]);
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.catalog.productsList({ category: slug, inStock: true }),
    queryFn: async () => catalogApi.products({ category: slug, inStock: true }),
    enabled: Boolean(bootstrap),
  });

  const category = allCategories.find((entry) => entry.slug === slug);
  if (!category && bootstrap) {
    throw notFound();
  }

  if (!category) {
    return null;
  }

  const products = data?.products ?? [];

  return (
    <div className="container-bg py-12 md:py-20">
      <div className="mb-10 border-b border-border pb-8">
        <div className="mb-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">Collection</div>
        <h1 className="display text-5xl md:text-7xl">{category.name}.</h1>
        <p className="mt-3 text-muted-foreground">{data?.meta.total ?? products.length} pieces curated for you.</p>
      </div>
      {isLoading ? (
        <div className="py-24 text-center text-muted-foreground">Loading the collection...</div>
      ) : products.length === 0 ? (
        <div className="py-24 text-center text-muted-foreground">Nothing here yet. Check back soon.</div>
      ) : (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 md:gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
