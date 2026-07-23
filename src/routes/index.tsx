import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { catalogApi } from "@/lib/catalog-api";
import { queryKeys } from "@/lib/query-keys";
import { ProductCard } from "@/components/shop/ProductCard";
import { isDiscountedProduct } from "@/lib/format";
import hero from "@/assets/hero.jpg";
import catMen from "@/assets/cat-men.jpg";
import catWomen from "@/assets/cat-women.jpg";
import catKids from "@/assets/cat-kids.jpg";
import catAcc from "@/assets/cat-acc.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BALY by Bilal Garments EST 2001. - Bold Modern Fashion" },
      { name: "description", content: "Discover the AW26 collection. Bold, modern clothing made in Pakistan." },
    ],
  }),
  component: Home,
});

const catVisuals = {
  men: catMen,
  women: catWomen,
  kids: catKids,
  accessories: catAcc,
} as const;

function Home() {
  const [showSaleModal, setShowSaleModal] = useState(false);
  const { data } = useQuery({
    queryKey: queryKeys.catalog.bootstrap,
    queryFn: catalogApi.bootstrap,
  });
  const saleQuery = useQuery({
    queryKey: ["catalog", "sale-products"],
    queryFn: catalogApi.saleProducts,
  });
  const products = data?.products ?? [];
  const categories = data?.categories ?? [];
  const topCategories = categories.filter((category) => !category.parentId);
  const featured = products.filter((p) => p.featured).slice(0, 8);
  const trending = products.filter((p) => p.trending).slice(0, 4);
  const sale = (saleQuery.data?.products ?? products.filter((product) => isDiscountedProduct(product))).slice(0, 4);

  useEffect(() => {
    if (!saleQuery.data?.products?.length) {
      return;
    }

    if (window.sessionStorage.getItem("sale-modal-dismissed") === "1") {
      return;
    }

    setShowSaleModal(true);
  }, [saleQuery.data?.products]);

  return (
    <>
      <section className="relative">
        <div className="container-bg grid gap-6 pt-6 md:grid-cols-12 md:pt-10">
          <div className="flex flex-col justify-end pb-10 md:col-span-5 md:pb-20">
            <span className="mb-6 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              AW26 · New collection
            </span>
            <h1 className="display text-[14vw] leading-[0.9] md:text-[6.5vw]">
              Wear bold.<br />
              Live <span className="text-accent">louder</span>.
            </h1>
            <p className="mt-6 max-w-md text-muted-foreground">
              Premium silhouettes built for the modern wardrobe. Built from
              Attock, made for everywhere.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/shop"
                className="group inline-flex items-center gap-2 bg-primary px-7 py-4 text-xs font-medium uppercase tracking-[0.2em] text-primary-foreground transition hover:bg-foreground/85"
              >
                Shop the drop
                <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/category/women"
                className="inline-flex items-center gap-2 border border-foreground px-7 py-4 text-xs font-medium uppercase tracking-[0.2em] transition hover:bg-foreground hover:text-primary-foreground"
              >
                Women
              </Link>
            </div>
          </div>
          <div className="md:col-span-7">
            <div className="relative aspect-[4/5] overflow-hidden bg-secondary md:aspect-[5/6]">
              <img src={hero} alt="AW26 campaign" className="h-full w-full object-cover" width={1536} height={1280} />
              <div className="absolute bottom-4 right-4 max-w-[220px] bg-background/95 px-4 py-3 backdrop-blur">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Look 01</div>
                <div className="mt-1 text-sm font-medium">The Sunshine Coat</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-bg mt-24">
        <SectionHead eyebrow="Shop by category" title="Find your fit." />
        <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
          {topCategories.map((category) => (
            <Link
              key={category.slug}
              to="/category/$slug"
              params={{ slug: category.slug }}
              className="group relative aspect-[4/5] overflow-hidden bg-secondary"
            >
              <img
                src={catVisuals[category.slug as keyof typeof catVisuals] ?? catMen}
                alt={category.name}
                loading="lazy"
                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-5 text-primary-foreground">
                <h3 className="display text-2xl">{category.name}</h3>
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-bg mt-24">
        <SectionHead eyebrow="Trending now" title="What everyone's wearing." linkTo="/shop" linkLabel="View all" />
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-8">
          {trending.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {sale.length > 0 && (
        <section className="mt-24 bg-primary py-20 text-primary-foreground">
          <div className="container-bg">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <div className="mb-3 text-xs uppercase tracking-[0.3em] text-accent">Limited time</div>
                <h2 className="display text-5xl md:text-6xl">Up to 40% off.</h2>
              </div>
              <Link to="/sale" className="hidden items-center gap-2 text-xs uppercase tracking-widest hover:text-accent md:inline-flex">
                Shop sale <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-8">
              {sale.map((product) => (
                <Link
                  key={product.id}
                  to="/product/$slug"
                  params={{ slug: product.slug }}
                  className="group block"
                >
                  <div className="img-zoom relative aspect-[4/5] overflow-hidden bg-secondary">
                    <img src={product.images[0]} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
                    <span className="absolute left-3 top-3 bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent-foreground">
                      Sale
                    </span>
                  </div>
                  <div className="pt-3 text-primary-foreground">
                    <div className="text-sm">{product.name}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="container-bg mt-24">
        <SectionHead eyebrow="Curated" title="Featured pieces." linkTo="/shop" linkLabel="Shop all" />
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-8">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="container-bg mt-24">
        <div className="grid items-center gap-8 bg-accent p-10 text-accent-foreground md:grid-cols-2 md:p-16">
          <div>
            <h2 className="display text-4xl md:text-5xl">Join the inside circle.</h2>
            <p className="mt-3 max-w-md">Early access to drops, members-only sales, and styling notes.</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert("Welcome to BALY by Bilal Garments EST 2001.");
              (e.currentTarget as HTMLFormElement).reset();
            }}
            className="flex bg-background"
          >
            <input
              required
              type="email"
              placeholder="Your email"
              className="flex-1 bg-transparent px-5 py-4 text-foreground outline-none"
            />
            <button className="bg-primary px-6 text-xs uppercase tracking-widest text-primary-foreground">
              Subscribe
            </button>
          </form>
        </div>
      </section>

      {showSaleModal && sale.length > 0 && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4" onClick={() => setShowSaleModal(false)}>
          <div className="w-full max-w-xl bg-background p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-2 text-xs uppercase tracking-[0.3em] text-accent">Sale edit</div>
            <h2 className="display text-3xl">Current markdowns are live.</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Selected sale products are now surfaced automatically from the live catalog.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {sale.slice(0, 2).map((product) => (
                <Link
                  key={product.id}
                  to="/product/$slug"
                  params={{ slug: product.slug }}
                  className="border border-border p-3 hover:bg-secondary"
                >
                  <div className="text-sm font-medium">{product.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {product.salePrice ? `Now Rs. ${product.salePrice.toLocaleString()}` : ""}
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/sale" className="inline-flex items-center gap-2 bg-primary px-5 py-3 text-xs uppercase tracking-[0.2em] text-primary-foreground">
                View sale <ArrowUpRight className="h-4 w-4" />
              </Link>
              <button
                onClick={() => {
                  window.sessionStorage.setItem("sale-modal-dismissed", "1");
                  setShowSaleModal(false);
                }}
                className="border border-border px-5 py-3 text-xs uppercase tracking-[0.2em]"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SectionHead({
  eyebrow,
  title,
  linkTo,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  linkTo?: "/shop";
  linkLabel?: string;
}) {
  return (
    <div className="mb-10 flex items-end justify-between">
      <div>
        <div className="mb-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">{eyebrow}</div>
        <h2 className="display text-4xl md:text-5xl">{title}</h2>
      </div>
      {linkTo && linkLabel && (
        <Link to={linkTo} className="hidden items-center gap-2 text-xs uppercase tracking-widest hover:text-accent md:inline-flex">
          {linkLabel} <ArrowUpRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
