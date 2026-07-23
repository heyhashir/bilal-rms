import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/shop/ProductCard";
import { catalogApi } from "@/lib/catalog-api";

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
  const saleQuery = useQuery({
    queryKey: ["catalog", "sale-products"],
    queryFn: catalogApi.saleProducts,
  });

  const products = saleQuery.data?.products ?? [];

  return (
    <div className="container-bg py-12 md:py-20">
      <div className="mb-10 border-b border-border pb-8">
        <div className="mb-3 text-xs uppercase tracking-[0.3em] text-accent">Sale</div>
        <h1 className="display text-5xl md:text-7xl">Marked down now.</h1>
        <p className="mt-3 text-muted-foreground">
          {saleQuery.data?.meta.total ?? products.length} live sale item{(saleQuery.data?.meta.total ?? products.length) === 1 ? "" : "s"}.
        </p>
      </div>
      {saleQuery.isLoading ? (
        <div className="py-24 text-center text-muted-foreground">Loading sale items...</div>
      ) : products.length === 0 ? (
        <div className="py-24 text-center text-muted-foreground">There are no live markdowns right now.</div>
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
