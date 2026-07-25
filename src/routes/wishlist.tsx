import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "@/lib/catalog-api";
import { queryKeys } from "@/lib/query-keys";
import { getEffectiveAmount } from "@/lib/format";
import { toast } from "sonner";
import { useCart, useWishlist } from "@/store/cart";
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
  const remove = useWishlist((s) => s.toggle);
  const addToCart = useCart((s) => s.add);
  const list = products.filter((p) => ids.includes(p.id));

  const moveToCart = (product: (typeof products)[number]) => {
    const variant = product.stockMode === "variant"
      ? product.variants.find((entry) => entry.isActive && entry.stock > 0)
      : null;
    const stock = variant?.stock ?? product.stock;

    if (stock <= 0) {
      toast.error("This product is currently out of stock");
      return;
    }

    addToCart({
      productId: product.id,
      variantId: variant?.id ?? null,
      name: product.name,
      image: product.images[0] ?? "",
      size: variant?.size ?? product.sizes[0] ?? "",
      color: variant?.colorName ?? product.colors[0]?.name ?? "",
      qty: 1,
      unitPrice: variant?.priceOverride ?? getEffectiveAmount(product.price, product.salePrice),
    });
    remove(product.id);
    toast.success(`${product.name} moved to cart`);
  };

  return (
    <div className="container-bg py-12 md:py-16">
      <h1 className="display text-4xl md:text-5xl mb-10">Wishlist.</h1>
      {list.length === 0 ? (
        <div className="bg-secondary p-12 text-center">
          <p className="text-muted-foreground mb-5">No favourites yet — start adding pieces you love.</p>
          <Link to="/shop" className="inline-block bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-widest">Discover</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-8">
          {list.map((p) => (
            <div key={p.id} className="min-w-0">
              <ProductCard product={p} />
              <div className="mt-3 flex gap-2 text-[10px] uppercase tracking-widest">
                <button
                  type="button"
                  onClick={() => moveToCart(p)}
                  className="flex-1 border border-border px-2 py-2 hover:border-foreground"
                >
                  Move to cart
                </button>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  className="border border-border px-2 py-2 text-sale hover:bg-sale hover:text-primary-foreground"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
