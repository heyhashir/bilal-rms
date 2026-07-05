import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Grid2x2, List as ListIcon } from "lucide-react";
import { useCatalog } from "@/store/catalog";
import { ProductCard } from "@/components/shop/ProductCard";
import type { Product } from "@/data/seed";

export const Route = createFileRoute("/shop")({
  head: () => ({ meta: [{ title: "Shop — Bilal Garments" }, { name: "description", content: "Browse the entire Bilal Garments collection." }] }),
  component: Shop,
});

type Sort = "newest" | "price-asc" | "price-desc" | "popular";

function Shop() {
  const products = useCatalog((s) => s.products);
  const categories = useCatalog((s) => s.categories);

  const allSizes = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.sizes))),
    [products],
  );
  const allColors = useMemo(
    () =>
      Array.from(
        new Map(
          products.flatMap((p) => p.colors).map((c) => [c.name, c]),
        ).values(),
      ),
    [products],
  );
  const max = Math.max(...products.map((p) => p.price), 0);

  const [cat, setCat] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [price, setPrice] = useState<number>(max);
  const [sort, setSort] = useState<Sort>("newest");
  const [view, setView] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    let r: Product[] = products.filter((p) => {
      if (cat.length && !cat.includes(p.category)) return false;
      if (sizes.length && !sizes.some((s) => p.sizes.includes(s))) return false;
      if (colors.length && !colors.some((c) => p.colors.find((x) => x.name === c))) return false;
      const eff = p.salePrice ?? p.price;
      if (eff > price) return false;
      return true;
    });
    if (sort === "newest") r = r.sort((a, b) => b.createdAt - a.createdAt);
    if (sort === "price-asc") r = r.sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
    if (sort === "price-desc") r = r.sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
    if (sort === "popular") r = r.sort((a, b) => Number(!!b.trending) - Number(!!a.trending));
    return r;
  }, [products, cat, sizes, colors, price, sort]);

  const toggle = (arr: string[], v: string, set: (x: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="container-bg py-10 md:py-16">
      <div className="flex items-end justify-between border-b border-border pb-6 mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Collection</div>
          <h1 className="display text-4xl md:text-5xl">Shop everything.</h1>
        </div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground hidden md:block">
          {filtered.length} items
        </div>
      </div>

      <div className="grid md:grid-cols-[240px_1fr] gap-10">
        {/* FILTERS */}
        <aside className="space-y-8 text-sm">
          <FilterGroup title="Category">
            {categories.map((c) => (
              <Check key={c.slug} label={c.name} checked={cat.includes(c.slug)} onChange={() => toggle(cat, c.slug, setCat)} />
            ))}
          </FilterGroup>
          <FilterGroup title="Size">
            <div className="flex flex-wrap gap-1.5">
              {allSizes.map((s) => (
                <button
                  key={s}
                  onClick={() => toggle(sizes, s, setSizes)}
                  className={`min-w-9 px-2 h-9 text-xs border ${sizes.includes(s) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-foreground"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </FilterGroup>
          <FilterGroup title="Color">
            <div className="flex flex-wrap gap-2">
              {allColors.map((c) => {
                const on = colors.includes(c.name);
                return (
                  <button
                    key={c.name}
                    title={c.name}
                    onClick={() => toggle(colors, c.name, setColors)}
                    className={`h-7 w-7 rounded-full border-2 transition ${on ? "border-foreground scale-110" : "border-border"}`}
                    style={{ background: c.hex }}
                  />
                );
              })}
            </div>
          </FilterGroup>
          <FilterGroup title="Max price">
            <input
              type="range"
              min={0}
              max={max}
              step={500}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground mt-1">Up to Rs. {price.toLocaleString()}</div>
          </FilterGroup>
          <button
            onClick={() => { setCat([]); setSizes([]); setColors([]); setPrice(max); }}
            className="text-xs uppercase tracking-widest underline underline-offset-4"
          >
            Reset filters
          </button>
        </aside>

        {/* GRID */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-muted-foreground md:hidden">{filtered.length} items</div>
            <div className="flex items-center gap-3 ml-auto">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="border border-border bg-background px-3 py-2 text-xs uppercase tracking-widest"
              >
                <option value="newest">Newest</option>
                <option value="popular">Popular</option>
                <option value="price-asc">Price ↑</option>
                <option value="price-desc">Price ↓</option>
              </select>
              <div className="hidden md:flex border border-border">
                <button className={`p-2 ${view === "grid" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setView("grid")} aria-label="Grid">
                  <Grid2x2 className="h-4 w-4" />
                </button>
                <button className={`p-2 ${view === "list" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setView("list")} aria-label="List">
                  <ListIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-24 text-center text-muted-foreground">No products match your filters.</div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-8">
              {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div>
              {filtered.map((p) => <ProductCard key={p.id} product={p} variant="list" />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-widest font-semibold mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-foreground" />
      <span>{label}</span>
    </label>
  );
}
