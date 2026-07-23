import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "@/lib/catalog-api";
import { queryKeys } from "@/lib/query-keys";
import { useWishlist } from "@/store/cart";
import { ProductCard } from "@/components/shop/ProductCard";

export const Route = createFileRoute("/wishlist")({
  head: () => ({ meta: [{ title: "Wishlist — Bilal Garments" }] }),
  component: Wishlist,
});

function Wishlist() {
  const { data } = useQuery({
    queryKey: queryKeys.catalog.bootstrap,
    queryFn: catalogApi.bootstrap,
  });
  const products = data?.products ?? [];
  const ids = useWishlist((s) => s.ids);
  const list = products.filter((p) => ids.includes(p.id));

  return (
    <div className="container-bg py-12 md:py-16">
      <h1 className="display text-4xl md:text-5xl mb-10">Wishlist.</h1>
      {list.length === 0 ? (
        <div className="bg-secondary p-12 text-center">
          <p className="text-muted-foreground mb-5">No favourites yet — start adding pieces you love.</p>
          <Link to="/shop" className="inline-block bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-widest">Discover</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-8">
          {list.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
