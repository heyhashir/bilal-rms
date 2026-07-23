import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import type { Product } from "@/lib/catalog-types";
import { formatPrice, getEffectiveAmount, isDiscountedProduct } from "@/lib/format";
import { useWishlist } from "@/store/cart";

export function ProductCard({ product, variant = "grid" }: { product: Product; variant?: "grid" | "list" }) {
  const wish = useWishlist();
  const fav = wish.ids.includes(product.id);
  const onSale = isDiscountedProduct(product);

  if (variant === "list") {
    return (
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        className="flex gap-5 border-b border-border py-5 group"
      >
        <div className="img-zoom relative w-40 aspect-[4/5] overflow-hidden bg-secondary shrink-0">
          <img src={product.images[0]} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium">{product.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{product.description}</p>
          <Price price={product.price} salePrice={product.salePrice} className="mt-3" />
        </div>
      </Link>
    );
  }

  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="block hover-lift group"
    >
      <div className="img-zoom relative aspect-[4/5] overflow-hidden bg-secondary">
        <img
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        {/* secondary image cross-fade */}
        {product.images[1] && (
          <img
            src={product.images[1]}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-100"
          />
        )}
        {onSale && (
          <span className="absolute left-3 top-3 bg-sale text-primary-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]">
            Sale
          </span>
        )}
        {product.stock === 0 && (
          <span className="absolute left-3 top-3 bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]">
            Sold out
          </span>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            wish.toggle(product.id);
          }}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/85 backdrop-blur-md shadow-sm opacity-0 translate-y-1 transition-all duration-500 ease-out group-hover:opacity-100 group-hover:translate-y-0 hover:bg-background hover:scale-105 active:scale-95"
          aria-label="Wishlist"
        >
          <Heart className={`h-4 w-4 transition-colors ${fav ? "fill-sale text-sale" : ""}`} />
        </button>
      </div>
      <div className="pt-4 space-y-1.5">
        <h3 className="text-[13px] font-medium tracking-tight line-clamp-1">{product.name}</h3>
        <Price price={product.price} salePrice={product.salePrice} />
      </div>
    </Link>
  );
}

export function Price({
  price,
  salePrice,
  className = "",
}: {
  price: number;
  salePrice?: number;
  className?: string;
}) {
  const effectivePrice = getEffectiveAmount(price, salePrice);
  if (effectivePrice < price) {
    return (
      <div className={`flex items-baseline gap-2 text-sm ${className}`}>
        <span className="font-semibold text-sale">{formatPrice(effectivePrice)}</span>
        <span className="text-muted-foreground line-through">{formatPrice(price)}</span>
      </div>
    );
  }
  return <div className={`text-sm font-semibold ${className}`}>{formatPrice(price)}</div>;
}
