import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useCatalog } from "@/store/catalog";
import { ProductCard } from "@/components/shop/ProductCard";
import hero from "@/assets/hero.jpg";
import catMen from "@/assets/cat-men.jpg";
import catWomen from "@/assets/cat-women.jpg";
import catKids from "@/assets/cat-kids.jpg";
import catAcc from "@/assets/cat-acc.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bilal Garments — Bold Modern Fashion" },
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
  const { products, categories } = useCatalog();
  const featured = products.filter((p) => p.featured).slice(0, 8);
  const trending = products.filter((p) => p.trending).slice(0, 4);
  const sale = products.filter((p) => p.salePrice && p.salePrice < p.price).slice(0, 4);

  return (
    <>
      {/* HERO */}
      <section className="relative">
        <div className="container-bg grid md:grid-cols-12 gap-6 pt-6 md:pt-10">
          <div className="md:col-span-5 flex flex-col justify-end pb-10 md:pb-20">
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-6">
              AW26 · New collection
            </span>
            <h1 className="display text-[14vw] md:text-[6.5vw] leading-[0.9]">
              Wear bold.<br />
              Live <span className="text-accent">louder</span>.
            </h1>
            <p className="mt-6 max-w-md text-muted-foreground">
              Premium silhouettes built for the modern wardrobe. Designed in
              Lahore, made for everywhere.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/shop"
                className="group inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-4 text-xs uppercase tracking-[0.2em] font-medium hover:bg-foreground/85 transition"
              >
                Shop the drop
                <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link
                to="/category/women"
                className="inline-flex items-center gap-2 border border-foreground px-7 py-4 text-xs uppercase tracking-[0.2em] font-medium hover:bg-foreground hover:text-primary-foreground transition"
              >
                Women
              </Link>
            </div>
          </div>
          <div className="md:col-span-7">
            <div className="relative aspect-[4/5] md:aspect-[5/6] overflow-hidden bg-secondary">
              <img src={hero} alt="AW26 campaign" className="h-full w-full object-cover" width={1536} height={1280} />
              <div className="absolute right-4 bottom-4 bg-background/95 backdrop-blur px-4 py-3 max-w-[220px]">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Look 01</div>
                <div className="text-sm mt-1 font-medium">The Sunshine Coat</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container-bg mt-24">
        <SectionHead eyebrow="Shop by category" title="Find your fit." />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to="/category/$slug"
              params={{ slug: c.slug }}
              className="group relative aspect-[4/5] overflow-hidden bg-secondary"
            >
              <img
                src={catVisuals[c.slug as keyof typeof catVisuals] ?? catMen}
                alt={c.name}
                loading="lazy"
                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 flex items-center justify-between text-primary-foreground">
                <h3 className="display text-2xl">{c.name}</h3>
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* TRENDING */}
      <section className="container-bg mt-24">
        <SectionHead eyebrow="Trending now" title="What everyone's wearing." linkTo="/shop" linkLabel="View all" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-8">
          {trending.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* SALE */}
      {sale.length > 0 && (
        <section className="mt-24 bg-primary text-primary-foreground py-20">
          <div className="container-bg">
            <div className="flex items-end justify-between mb-10">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Limited time</div>
                <h2 className="display text-5xl md:text-6xl">Up to 40% off.</h2>
              </div>
              <Link to="/shop" className="hidden md:inline-flex items-center gap-2 text-xs uppercase tracking-widest hover:text-accent">
                Shop sale <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-8">
              {sale.map((p) => (
                <Link
                  key={p.id}
                  to="/product/$slug"
                  params={{ slug: p.slug }}
                  className="block group"
                >
                  <div className="img-zoom relative aspect-[4/5] overflow-hidden bg-secondary">
                    <img src={p.images[0]} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                    <span className="absolute left-3 top-3 bg-accent text-accent-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                      Sale
                    </span>
                  </div>
                  <div className="pt-3 text-primary-foreground">
                    <div className="text-sm">{p.name}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FEATURED */}
      <section className="container-bg mt-24">
        <SectionHead eyebrow="Curated" title="Featured pieces." linkTo="/shop" linkLabel="Shop all" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-8">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="container-bg mt-24">
        <div className="bg-accent text-accent-foreground p-10 md:p-16 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="display text-4xl md:text-5xl">Join the inside circle.</h2>
            <p className="mt-3 max-w-md">Early access to drops, members-only sales, and styling notes.</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert("Welcome to Bilal Garments.");
              (e.currentTarget as HTMLFormElement).reset();
            }}
            className="flex bg-background"
          >
            <input
              required
              type="email"
              placeholder="Your email"
              className="flex-1 bg-transparent text-foreground px-5 py-4 outline-none"
            />
            <button className="bg-primary text-primary-foreground px-6 text-xs uppercase tracking-widest">
              Subscribe
            </button>
          </form>
        </div>
      </section>
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
    <div className="flex items-end justify-between mb-10">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">{eyebrow}</div>
        <h2 className="display text-4xl md:text-5xl">{title}</h2>
      </div>
      {linkTo && linkLabel && (
        <Link to={linkTo} className="hidden md:inline-flex items-center gap-2 text-xs uppercase tracking-widest hover:text-accent">
          {linkLabel} <ArrowUpRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
