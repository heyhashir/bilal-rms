import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Minus, Plus, Ruler, ShieldCheck, Truck, X } from "lucide-react";
import { useCatalog } from "@/store/catalog";
import { useCart, useWishlist } from "@/store/cart";
import { ProductCard } from "@/components/shop/ProductCard";
import { Price } from "@/components/shop/ProductCard";
import { sizeCharts } from "@/config/site";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Bilal Garments` },
      { name: "description", content: "Premium product details, sizing, and styling notes." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const products = useCatalog((s) => s.products);
  const product = products.find((p) => p.slug === slug);
  if (!product) throw notFound();

  const wish = useWishlist();
  const cart = useCart();
  const fav = wish.has(product.id);

  const [img, setImg] = useState(0);
  const [size, setSize] = useState<string>(product.sizes[0] ?? "");
  const [color, setColor] = useState<string>(product.colors[0]?.name ?? "");
  const [qty, setQty] = useState(1);
  const [showChart, setShowChart] = useState(false);

  const inStock = product.stock > 0;
  const unitPrice = product.salePrice ?? product.price;

  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  const addToCart = () => {
    if (!inStock) return;
    if (!size) return toast.error("Please select a size");
    if (!color) return toast.error("Please select a color");
    cart.add({
      productId: product.id,
      name: product.name,
      image: product.images[0],
      size, color, qty,
      unitPrice,
    });
    toast.success(`${product.name} added to cart`);
  };

  return (
    <div className="container-bg py-10 md:py-14">
      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
        {/* GALLERY */}
        <div className="grid grid-cols-[80px_1fr] gap-4">
          <div className="flex flex-col gap-3">
            {product.images.map((src, i) => (
              <button
                key={i}
                onClick={() => setImg(i)}
                className={`aspect-[4/5] overflow-hidden bg-secondary border ${img === i ? "border-foreground" : "border-border"}`}
              >
                <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <div className="aspect-[4/5] overflow-hidden bg-secondary">
            <img src={product.images[img]} alt={product.name} className="h-full w-full object-cover" />
          </div>
        </div>

        {/* DETAILS */}
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{product.category}</div>
          <h1 className="display text-4xl md:text-5xl mt-2">{product.name}</h1>
          <Price price={product.price} salePrice={product.salePrice} className="mt-4 text-base" />

          <p className="mt-6 text-muted-foreground leading-relaxed">{product.description}</p>

          {/* COLOR */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-widest font-semibold">Color: {color}</span>
            </div>
            <div className="flex gap-2">
              {product.colors.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setColor(c.name)}
                  title={c.name}
                  className={`h-10 w-10 rounded-full border-2 transition ${color === c.name ? "border-foreground scale-110" : "border-border"}`}
                  style={{ background: c.hex }}
                />
              ))}
            </div>
          </div>

          {/* SIZE */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-widest font-semibold">Size</span>
              {product.sizeChart !== "none" && (
                <button onClick={() => setShowChart(true)} className="text-xs uppercase tracking-widest underline underline-offset-4 inline-flex items-center gap-1">
                  <Ruler className="h-3.5 w-3.5" /> Size guide
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`min-w-12 h-11 px-3 text-sm border ${size === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-foreground"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* QTY + ATC */}
          <div className="mt-8 flex items-center gap-3">
            <div className="flex items-center border border-border h-12">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 h-full"><Minus className="h-4 w-4" /></button>
              <span className="w-10 text-center">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="px-3 h-full"><Plus className="h-4 w-4" /></button>
            </div>
            <button
              onClick={addToCart}
              disabled={!inStock}
              className="flex-1 h-12 bg-primary text-primary-foreground text-xs uppercase tracking-[0.2em] font-medium hover:bg-foreground/85 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {inStock ? "Add to cart" : "Sold out"}
            </button>
            <button
              onClick={() => { wish.toggle(product.id); toast.success(fav ? "Removed from wishlist" : "Added to wishlist"); }}
              className="h-12 w-12 grid place-items-center border border-border hover:border-foreground"
              aria-label="Wishlist"
            >
              <Heart className={`h-4 w-4 ${fav ? "fill-sale text-sale" : ""}`} />
            </button>
          </div>

          <div className="mt-3 text-sm">
            {inStock ? (
              <span className="text-muted-foreground">In stock · <span className="text-foreground">{product.stock} available</span></span>
            ) : (
              <span className="text-sale font-medium">Currently sold out</span>
            )}
          </div>

          {/* PERKS */}
          <div className="mt-10 grid grid-cols-2 gap-3 text-xs">
            <Perk icon={<Truck className="h-4 w-4" />} label="Free shipping over Rs. 5,000" />
            <Perk icon={<ShieldCheck className="h-4 w-4" />} label="7-day easy returns" />
          </div>

          {/* TAGS */}
          {product.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {product.tags.map((t) => (
                <span key={t} className="text-xs px-2 py-1 bg-secondary text-muted-foreground">{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RELATED */}
      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="display text-3xl md:text-4xl mb-8">You may also like.</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-8">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* SIZE CHART MODAL */}
      {showChart && product.sizeChart !== "none" && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setShowChart(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-background w-full max-w-lg p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Size guide</div>
                <h3 className="display text-2xl mt-1">{sizeCharts[product.sizeChart].label}</h3>
              </div>
              <button onClick={() => setShowChart(false)}><X className="h-5 w-5" /></button>
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-widest text-muted-foreground">
                <tr><th className="text-left py-2">Size</th><th className="text-left py-2">Chest</th><th className="text-left py-2">Length</th></tr>
              </thead>
              <tbody>
                {sizeCharts[product.sizeChart].rows.map((r) => (
                  <tr key={r.size} className="border-t border-border">
                    <td className="py-2 font-medium">{r.size}</td>
                    <td className="py-2">{r.chest}</td>
                    <td className="py-2">{r.length}</td>
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
