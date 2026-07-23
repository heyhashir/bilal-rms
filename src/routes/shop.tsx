import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Grid2x2, List as ListIcon } from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { catalogApi } from "@/lib/catalog-api";
import type { CatalogListParams } from "@/lib/catalog-filters";
import { queryKeys } from "@/lib/query-keys";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop - Bilal Garments" },
      { name: "description", content: "Browse the entire Bilal Garments collection." },
    ],
  }),
  component: Shop,
});

type Sort = NonNullable<CatalogListParams["sort"]>;

function Shop() {
  const { data: bootstrap } = useQuery({
    queryKey: queryKeys.catalog.bootstrap,
    queryFn: catalogApi.bootstrap,
  });

  const categories = bootstrap?.categories ?? [];
  const brands = bootstrap?.brands ?? [];
  const seedProducts = bootstrap?.products ?? [];
  const allSizes = useMemo(() => Array.from(new Set(seedProducts.flatMap((product) => product.sizes))), [seedProducts]);
  const allColors = useMemo(
    () => Array.from(new Map(seedProducts.flatMap((product) => product.colors).map((color) => [color.name, color])).values()),
    [seedProducts],
  );
  const initialMax = useMemo(() => Math.max(...seedProducts.map((product) => product.effectivePrice), 0), [seedProducts]);

  const [category, setCategory] = useState<string>("");
  const [brand, setBrand] = useState<string>("");
  const [size, setSize] = useState<string>("");
  const [color, setColor] = useState<string>("");
  const [price, setPrice] = useState(0);
  const [sort, setSort] = useState<Sort>("newest");
  const [view, setView] = useState<"grid" | "list">("grid");

  const params = useMemo<CatalogListParams>(
    () => ({
      category: category || undefined,
      brand: brand || undefined,
      size: size || undefined,
      color: color || undefined,
      maxPrice: price > 0 ? price : undefined,
      sort,
      inStock: true,
    }),
    [brand, category, color, price, size, sort],
  );

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: queryKeys.catalog.productsList(params),
    queryFn: async () => catalogApi.products(params),
    enabled: Boolean(bootstrap),
  });

  const products = data?.products ?? [];
  const max = data?.meta.maxEffectivePrice ?? initialMax;

  useEffect(() => {
    if (!bootstrap) {
      return;
    }

    setPrice((current) => {
      if (max === 0) {
        return 0;
      }

      if (current === 0 || current > max) {
        return max;
      }

      return current;
    });
  }, [bootstrap, max]);

  return (
    <div className="container-bg py-10 md:py-16">
      <div className="mb-8 flex items-end justify-between border-b border-border pb-6">
        <div>
          <div className="mb-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">Collection</div>
          <h1 className="display text-4xl md:text-5xl">Shop everything.</h1>
        </div>
        <div className="hidden text-xs uppercase tracking-widest text-muted-foreground md:block">
          {data?.meta.total ?? products.length} items
        </div>
      </div>

      <div className="grid gap-10 md:grid-cols-[240px_1fr]">
        <aside className="space-y-8 text-sm">
          <FilterGroup title="Category">
            {categories.map((entry) => (
              <Check
                key={entry.slug}
                label={entry.name}
                checked={category === entry.slug}
                onChange={() => setCategory((current) => (current === entry.slug ? "" : entry.slug))}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Brand">
            <select
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              className="w-full border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">All brands</option>
              {brands.map((entry) => (
                <option key={entry.slug} value={entry.slug}>
                  {entry.name}
                </option>
              ))}
            </select>
          </FilterGroup>

          <FilterGroup title="Size">
            <div className="flex flex-wrap gap-1.5">
              {allSizes.map((entry) => (
                <button
                  key={entry}
                  onClick={() => setSize((current) => (current === entry ? "" : entry))}
                  className={`min-w-9 border px-2 text-xs ${size === entry ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-foreground"} h-9`}
                >
                  {entry}
                </button>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="Color">
            <div className="flex flex-wrap gap-2">
              {allColors.map((entry) => {
                const active = color === entry.name;
                return (
                  <button
                    key={entry.name}
                    title={entry.name}
                    onClick={() => setColor((current) => (current === entry.name ? "" : entry.name))}
                    className={`h-7 w-7 rounded-full border-2 transition ${active ? "scale-110 border-foreground" : "border-border"}`}
                    style={{ background: entry.hex }}
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
              onChange={(event) => setPrice(Number(event.target.value))}
              disabled={max === 0}
              className="w-full"
            />
            <div className="mt-1 text-xs text-muted-foreground">Up to Rs. {price.toLocaleString()}</div>
          </FilterGroup>

          <button
            onClick={() => {
              setCategory("");
              setBrand("");
              setSize("");
              setColor("");
              setPrice(max);
              setSort("newest");
            }}
            className="text-xs uppercase tracking-widest underline underline-offset-4"
          >
            Reset filters
          </button>
        </aside>

        <div>
          <div className="mb-6 flex items-center justify-between">
            <div className="text-sm text-muted-foreground md:hidden">{data?.meta.total ?? products.length} items</div>
            <div className="ml-auto flex items-center gap-3">
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                className="border border-border bg-background px-3 py-2 text-xs uppercase tracking-widest"
              >
                <option value="newest">Newest</option>
                <option value="popular">Popular</option>
                <option value="price-asc">Price ↑</option>
                <option value="price-desc">Price ↓</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </select>
              <div className="hidden border border-border md:flex">
                <button
                  className={`p-2 ${view === "grid" ? "bg-primary text-primary-foreground" : ""}`}
                  onClick={() => setView("grid")}
                  aria-label="Grid"
                >
                  <Grid2x2 className="h-4 w-4" />
                </button>
                <button
                  className={`p-2 ${view === "list" ? "bg-primary text-primary-foreground" : ""}`}
                  onClick={() => setView("list")}
                  aria-label="List"
                >
                  <ListIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {isFetching && !isLoading && (
            <div className="mb-4 text-xs uppercase tracking-widest text-muted-foreground">Refreshing catalog...</div>
          )}

          {!bootstrap || isLoading ? (
            <div className="py-24 text-center text-muted-foreground">Loading collection...</div>
          ) : isError ? (
            <div className="py-24 text-center">
              <p className="text-muted-foreground">The catalog could not be loaded right now.</p>
              <button onClick={() => void refetch()} className="mt-4 text-xs uppercase tracking-widest underline underline-offset-4">
                Try again
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="py-24 text-center text-muted-foreground">No products match your filters.</div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3 md:gap-8">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} variant="list" />
              ))}
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
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-foreground" />
      <span>{label}</span>
    </label>
  );
}
