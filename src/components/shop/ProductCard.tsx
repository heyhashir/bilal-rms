import { Link } from "@tanstack/react-router";
import { Heart, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Product } from "@/lib/catalog-types";
import { formatPrice, getEffectiveAmount, isDiscountedProduct } from "@/lib/format";
import { useExchangeRate } from "@/lib/currency";
import { useCart, useWishlist } from "@/store/cart";

export function ProductCard({ product, variant = "grid" }: { product: Product; variant?: "grid" | "list" }) {
  const wish = useWishlist();
  const cart = useCart();
  const fav = wish.ids.includes(product.id);
  const onSale = isDiscountedProduct(product);
  const primaryImage = product.images[0];
  const [showQuickSizes, setShowQuickSizes] = useState(false);

  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const effectivePrice = getEffectiveAmount(product.price, product.salePrice);
  const hasVariants = product.variants && product.variants.length > 0;

  const displayedImage =
    (selectedColor &&
      (product.variants?.find((v) => v.colorName === selectedColor && v.image)?.image ||
        product.colors?.find((c) => c.name === selectedColor && c.image)?.image)) ||
    primaryImage;

  const handleQuickAdd = (variantItem?: (typeof product.variants)[0]) => {
    const chosenSize = variantItem?.size ?? product.sizes[0] ?? "Standard";
    const chosenColor = variantItem?.colorName ?? selectedColor ?? product.colors[0]?.name ?? "Standard";
    const chosenPrice = variantItem?.price ? Number(variantItem.price) : effectivePrice;
    const chosenImage = variantItem?.image || displayedImage || primaryImage || "";

    cart.add({
      productId: product.id,
      variantId: variantItem?.id ?? null,
      name: product.name,
      image: chosenImage,
      size: chosenSize,
      color: chosenColor,
      unitPrice: chosenPrice,
      qty: 1,
    });

    toast.success(`Added ${product.name} (${chosenSize}) to cart!`);
    setShowQuickSizes(false);
  };

  if (variant === "list") {
    return (
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        className="flex gap-5 border-b border-border py-5 group"
      >
        <div className="img-zoom relative w-40 aspect-[4/5] overflow-hidden bg-secondary shrink-0">
          {displayedImage ? (
            <img src={displayedImage} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-all duration-300" />
          ) : (
            <div className="flex h-full items-end p-3 text-xs text-muted-foreground">{product.name}</div>
          )}
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
    <div className="block hover-lift group relative">
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        className="block"
      >
        <div className="img-zoom relative aspect-[4/5] overflow-hidden bg-secondary">
          {displayedImage ? (
            <img
              src={displayedImage}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-all duration-300"
            />
          ) : (
            <div className="flex h-full items-end p-4 text-sm text-muted-foreground">{product.name}</div>
          )}
          {/* secondary image cross-fade when not hovered over a specific color */}
          {!selectedColor && product.images[1] && (
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
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/85 backdrop-blur-md shadow-sm opacity-0 translate-y-1 transition-all duration-500 ease-out group-hover:opacity-100 group-hover:translate-y-0 hover:bg-background hover:scale-105 active:scale-95 z-20"
            aria-label="Wishlist"
          >
            <Heart className={`h-4 w-4 transition-colors ${fav ? "fill-sale text-sale" : ""}`} />
          </button>

          {/* Quick Size Selection Overlay */}
          {showQuickSizes && (
            <div
              className="absolute inset-x-0 bottom-0 z-30 bg-background/95 p-3 backdrop-blur-md transition-all duration-300"
              onClick={(e) => e.preventDefault()}
            >
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">
                Select Size
              </div>
              <div className="flex flex-wrap justify-center gap-1.5">
                {hasVariants
                  ? product.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={(e) => {
                          e.preventDefault();
                          handleQuickAdd(v);
                        }}
                        className="border border-border bg-background px-2.5 py-1 text-xs font-semibold hover:border-foreground hover:bg-foreground hover:text-background transition-colors"
                      >
                        {v.size || v.sku}
                      </button>
                    ))
                  : product.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={(e) => {
                          e.preventDefault();
                          handleQuickAdd();
                        }}
                        className="border border-border bg-background px-2.5 py-1 text-xs font-semibold hover:border-foreground hover:bg-foreground hover:text-background transition-colors"
                      >
                        {size}
                      </button>
                    ))}
              </div>
            </div>
          )}

          {/* Quick Add Button Overlay */}
          {!showQuickSizes && product.stock > 0 && (
            <button
              onClick={(e) => {
                e.preventDefault();
                if ((hasVariants && product.variants.length > 1) || product.sizes.length > 1) {
                  setShowQuickSizes(true);
                } else {
                  handleQuickAdd(hasVariants ? product.variants[0] : undefined);
                }
              }}
              className="absolute inset-x-3 bottom-3 z-20 hidden items-center justify-center gap-2 bg-background/90 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-foreground shadow-md backdrop-blur-md transition duration-300 group-hover:flex hover:bg-foreground hover:text-background"
            >
              <Plus className="h-3.5 w-3.5" /> Quick Add
            </button>
          )}
        </div>
        <div className="pt-4 space-y-1.5">
          <h3 className="text-[13px] font-medium tracking-tight line-clamp-1 group-hover:text-accent transition-colors">
            {product.name}
          </h3>
          <Price price={product.price} salePrice={product.salePrice} />
          {product.colors && product.colors.length > 1 && (
            <div className="flex items-center gap-1.5 pt-1" onClick={(e) => e.preventDefault()}>
              {product.colors.slice(0, 5).map((color) => (
                <button
                  key={color.name}
                  type="button"
                  title={color.name}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedColor(color.name);
                  }}
                  onMouseEnter={() => setSelectedColor(color.name)}
                  className={`h-3.5 w-3.5 rounded-full border transition-transform ${
                    (selectedColor ?? product.colors[0]?.name) === color.name
                      ? "scale-125 border-foreground shadow-sm"
                      : "border-black/20 hover:scale-110"
                  }`}
                  style={{ backgroundColor: color.hex }}
                />
              ))}
              {product.colors.length > 5 && (
                <span className="text-[10px] text-muted-foreground">+{product.colors.length - 5}</span>
              )}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

export function Price({
  price,
  salePrice,
  className = "",
  showUsd = true,
}: {
  price: number;
  salePrice?: number;
  className?: string;
  showUsd?: boolean;
}) {
  const { formatUsdShort } = useExchangeRate();
  const effectivePrice = getEffectiveAmount(price, salePrice);
  if (effectivePrice < price) {
    return (
      <div className={`space-y-0.5 ${className}`}>
        <div className="flex items-baseline gap-2 text-sm">
          <span className="font-semibold text-sale">{formatPrice(effectivePrice)}</span>
          <span className="text-muted-foreground line-through text-xs">{formatPrice(price)}</span>
        </div>
        {showUsd && (
          <div className="text-[11px] font-medium text-muted-foreground">
            ≈ {formatUsdShort(effectivePrice)} USD
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={`space-y-0.5 ${className}`}>
      <div className="text-sm font-semibold">{formatPrice(price)}</div>
      {showUsd && (
        <div className="text-[11px] font-medium text-muted-foreground">
          ≈ {formatUsdShort(price)} USD
        </div>
      )}
    </div>
  );
}
