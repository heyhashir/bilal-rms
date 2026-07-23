import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, Minus, Plus, Ruler, ShieldCheck, Truck, X } from "lucide-react";
import { catalogApi } from "@/lib/catalog-api";
import { queryKeys } from "@/lib/query-keys";
import { useCart, useWishlist } from "@/store/cart";
import { ProductCard } from "@/components/shop/ProductCard";
import { Price } from "@/components/shop/ProductCard";
import { sizeCharts } from "@/config/site";
import { toast } from "sonner";
import { getEffectiveAmount } from "@/lib/format";

export const Route = createFileRoute("/product/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} - BALI by Bilal Garments EST 2001.` },
      { name: "description", content: "Premium product details, sizing, and styling notes." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: bootstrap } = useQuery({
    queryKey: queryKeys.catalog.bootstrap,
    queryFn: catalogApi.bootstrap,
  });
  const { data: productResponse } = useQuery({
    queryKey: queryKeys.catalog.product(slug),
    queryFn: async () => catalogApi.product(slug),
  });
  const products = bootstrap?.products ?? [];
  const loaded = Boolean(productResponse ?? bootstrap);
  const wish = useWishlist();
  const cart = useCart();
  const product = productResponse?.product ?? products.find((p) => p.slug === slug);
  const [img, setImg] = useState(0);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [qty, setQty] = useState(1);
  const [showChart, setShowChart] = useState(false);

  const gallery = useMemo(
    () =>
      product
        ? [
            ...product.images.map((src) => ({ type: "image" as const, src })),
            ...(product.video ? [{ type: "video" as const, src: product.video }] : []),
          ]
        : [],
    [product],
  );

  useEffect(() => {
    if (!product) {
      return;
    }

    setImg(0);
    setQty(1);
    setSize((current) => (current && product.sizes.includes(current) ? current : (product.sizes[0] ?? "")));
    setColor((current) =>
      current && product.colors.some((entry) => entry.name === current) ? current : (product.colors[0]?.name ?? ""),
    );
  }, [product?.id]);

  if (!product && loaded) throw notFound();
  if (!product) return null;
  const fav = wish.has(product.id);
  const hasSizes = product.sizes.length > 0;
  const hasColors = product.colors.length > 0;
  const activeVariant =
    product.stockMode === "variant"
      ? product.variants.find((variant) => {
          const sizeMatch = !hasSizes || variant.size === size;
          const colorMatch = !hasColors || variant.colorName === color;
          return sizeMatch && colorMatch;
        })
      : null;
  const inStock = activeVariant ? activeVariant.stock > 0 : product.stock > 0;
  const unitPrice = activeVariant?.priceOverride ?? getEffectiveAmount(product.price, product.salePrice);

  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  const addToCart = () => {
    if (!inStock) return;
    if (hasSizes && !size) return toast.error("Please select a size");
    if (hasColors && !color) return toast.error("Please select a color");
    if (product.stockMode === "variant" && !activeVariant) return toast.error("Select an available variant");
    cart.add({
      productId: product.id,
      variantId: activeVariant?.id ?? null,
      name: product.name,
      image: product.images[0],
      size: hasSizes ? size : "",
      color: hasColors ? color : "",
      qty,
      unitPrice,
    });
    toast.success(`${product.name} added to cart`);
  };

  return (
    <div className="container-bg py-10 md:py-14">
      <div className="grid gap-10 md:grid-cols-2 lg:gap-16">
        <div className="grid grid-cols-[80px_1fr] gap-4">
          <div className="flex flex-col gap-3">
            {gallery.map((media, i) => (
              <button
                key={`${media.type}-${media.src}`}
                onClick={() => setImg(i)}
                className={`aspect-[4/5] overflow-hidden border bg-secondary ${img === i ? "border-foreground" : "border-border"}`}
              >
                {media.type === "image" ? (
                  <img src={media.src} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    Video
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="aspect-[4/5] overflow-hidden bg-secondary">
            {gallery[img]?.type === "video" ? (
              <video src={gallery[img].src} controls className="h-full w-full object-contain" />
            ) : (
              <img src={gallery[img]?.src ?? product.images[0]} alt={product.name} className="h-full w-full object-cover" />
            )}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{product.category}</div>
          <h1 className="display mt-2 text-4xl md:text-5xl">{product.name}</h1>
          <Price price={product.price} salePrice={product.salePrice} className="mt-4 text-base" />

          <p className="mt-6 leading-relaxed text-muted-foreground">{product.description}</p>

          {hasColors && (
            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest">Color: {color}</span>
              </div>
              <div className="flex gap-2">
                {product.colors.map((entry) => (
                  <button
                    key={entry.name}
                    onClick={() => setColor(entry.name)}
                    title={entry.name}
                    className={`h-10 w-10 rounded-full border-2 transition ${color === entry.name ? "scale-110 border-foreground" : "border-border"}`}
                    style={{ background: entry.hex }}
                  />
                ))}
              </div>
            </div>
          )}

          {hasSizes && (
            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest">Size</span>
                {product.sizeChart !== "none" && sizeCharts[product.sizeChart] && (
                  <button onClick={() => setShowChart(true)} className="inline-flex items-center gap-1 text-xs uppercase tracking-widest underline underline-offset-4">
                    <Ruler className="h-3.5 w-3.5" /> Size guide
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((entry) => (
                  <button
                    key={entry}
                    onClick={() => setSize(entry)}
                    className={`min-w-12 h-11 border px-3 text-sm ${size === entry ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-foreground"}`}
                  >
                    {entry}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center gap-3">
            <div className="flex h-12 items-center border border-border">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-full px-3"><Minus className="h-4 w-4" /></button>
              <span className="w-10 text-center">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="h-full px-3"><Plus className="h-4 w-4" /></button>
            </div>
            <button
              onClick={addToCart}
              disabled={!inStock}
              className="h-12 flex-1 bg-primary text-xs font-medium uppercase tracking-[0.2em] text-primary-foreground transition hover:bg-foreground/85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {inStock ? "Add to cart" : "Sold out"}
            </button>
            <button
              onClick={() => { wish.toggle(product.id); toast.success(fav ? "Removed from wishlist" : "Added to wishlist"); }}
              className="grid h-12 w-12 place-items-center border border-border hover:border-foreground"
              aria-label="Wishlist"
            >
              <Heart className={`h-4 w-4 ${fav ? "fill-sale text-sale" : ""}`} />
            </button>
          </div>

          <div className="mt-3 text-sm">
            {inStock ? (
              <span className="text-muted-foreground">In stock · <span className="text-foreground">{activeVariant?.stock ?? product.stock} available</span></span>
            ) : (
              <span className="font-medium text-sale">Currently sold out</span>
            )}
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 text-xs">
            <Perk icon={<Truck className="h-4 w-4" />} label="Free shipping over Rs. 5,000" />
            <Perk icon={<ShieldCheck className="h-4 w-4" />} label="7-day easy returns" />
          </div>

          {product.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span key={tag} className="bg-secondary px-2 py-1 text-xs text-muted-foreground">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="display mb-8 text-3xl md:text-4xl">You may also like.</h2>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-8">
            {related.map((entry) => <ProductCard key={entry.id} product={entry} />)}
          </div>
        </section>
      )}

      {showChart && product.sizeChart !== "none" && sizeCharts[product.sizeChart] && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setShowChart(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-background p-8">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Size guide</div>
                <h3 className="display mt-1 text-2xl">{sizeCharts[product.sizeChart].label}</h3>
              </div>
              <button onClick={() => setShowChart(false)}><X className="h-5 w-5" /></button>
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-widest text-muted-foreground">
                <tr><th className="py-2 text-left">Size</th><th className="py-2 text-left">Chest</th><th className="py-2 text-left">Length</th></tr>
              </thead>
              <tbody>
                {sizeCharts[product.sizeChart].rows.map((row) => (
                  <tr key={row.size} className="border-t border-border">
                    <td className="py-2 font-medium">{row.size}</td>
                    <td className="py-2">{row.chest}</td>
                    <td className="py-2">{row.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Link to="/shop" className="sr-only">Back to shop</Link>
    </div>
  );
}

function Perk({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 border border-border p-3">
      <span className="text-accent">{icon}</span>
      <span>{label}</span>
    </div>
  );
}
