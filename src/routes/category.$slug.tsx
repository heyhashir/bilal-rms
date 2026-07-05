import { createFileRoute, notFound } from "@tanstack/react-router";
import { useCatalog } from "@/store/catalog";
import { ProductCard } from "@/components/shop/ProductCard";

export const Route = createFileRoute("/category/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.charAt(0).toUpperCase() + params.slug.slice(1)} — Bilal Garments` },
      { name: "description", content: `Shop the ${params.slug} collection at Bilal Garments.` },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const products = useCatalog((s) => s.products);
  const categories = useCatalog((s) => s.categories);
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) throw notFound();
  const list = products.filter((p) => p.category === slug);

  return (
    <div className="container-bg py-12 md:py-20">
      <div className="border-b border-border pb-8 mb-10">
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">Collection</div>
        <h1 className="display text-5xl md:text-7xl">{cat.name}.</h1>
        <p className="mt-3 text-muted-foreground">{list.length} pieces curated for you.</p>
      </div>
      {list.length === 0 ? (
        <div className="py-24 text-center text-muted-foreground">Nothing here yet. Check back soon.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-8">
          {list.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
