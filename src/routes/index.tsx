import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { catalogApi } from "@/lib/catalog-api";
import { queryKeys } from "@/lib/query-keys";
import { HeroSlider } from "@/components/shop/HeroSlider";
import { StoryPills } from "@/components/shop/StoryPills";
import { CampaignTiles } from "@/components/shop/CampaignTiles";
import { TabbedProductShowcase } from "@/components/shop/TabbedProductShowcase";
import { TrustBadges } from "@/components/shop/TrustBadges";
import { CommunityGallery } from "@/components/shop/CommunityGallery";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BALY by Bilal Garments EST 2001. - Bold Modern Fashion" },
      { name: "description", content: "Discover the Summer '26 collection. Bold, modern fashion made in Pakistan." },
    ],
  }),
  component: Home,
});

function Home() {
  const { data } = useQuery({
    queryKey: queryKeys.catalog.bootstrap,
    queryFn: catalogApi.bootstrap,
  });

  const products = data?.products ?? [];

  return (
    <div className="w-full">
      {/* 1. Full-Width Edge-to-Edge Campaign Hero Slider */}
      <HeroSlider />

      {/* 2. Circular Story Category Navigation Pills */}
      <StoryPills />

      {/* 3. Curated Campaign Grid (2-Col & 3-Col Editorial Banners) */}
      <CampaignTiles />

      {/* 4. Tabbed Arrivals & Product Showcase with Quick-Add */}
      <TabbedProductShowcase products={products} />

      {/* 5. Mid-Page Full-Width Editorial Lookbook Banner */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground py-20 md:py-28 my-8">
        <div className="absolute inset-0 opacity-25">
          <img src={heroImg} alt="Campaign background" className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary/60" />
        <div className="container-bg relative z-10 grid md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-8 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.35em] text-accent mb-3">
              <Sparkles className="h-4 w-4" /> Season Spotlight
            </div>
            <h2 className="display text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
              Summer '26 Lookbook. Crafted In Pakistan.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-primary-foreground/80 leading-relaxed max-w-xl">
              From hand-embroidered artisanal lawns to precision-cut everyday menswear, explore our latest seasonal vision.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/shop"
                className="group inline-flex items-center gap-2 bg-accent px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] text-accent-foreground shadow-lg transition hover:bg-white hover:text-black"
              >
                Shop The Drop <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link
                to="/sale"
                className="inline-flex items-center gap-2 border-2 border-white/80 px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-white hover:text-black"
              >
                View Markdowns
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Brand Trust & Customer Value Reassurance Strip */}
      <TrustBadges />

      {/* 7. Social Community Lookbook (#SpottedInBALY) */}
      <CommunityGallery />

      {/* 8. VIP Club Newsletter Section */}
      <section className="container-bg py-16 md:py-24">
        <div className="grid items-center gap-8 bg-accent p-8 sm:p-12 text-accent-foreground md:grid-cols-2 md:p-16 shadow-lg">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent-foreground/80">
              Exclusive Access
            </span>
            <h2 className="display text-3xl sm:text-4xl md:text-5xl font-bold mt-1">
              Join The BALY Circle.
            </h2>
            <p className="mt-3 max-w-md text-sm text-accent-foreground/85">
              Enjoy 10% off your first order, priority access to new lawn drops, and members-only styling edits.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert("Welcome to BALY by Bilal Garments EST 2001.");
              (e.currentTarget as HTMLFormElement).reset();
            }}
            className="flex flex-col sm:flex-row border border-accent-foreground/20 bg-background shadow-md"
          >
            <input
              required
              type="email"
              placeholder="Enter your email address"
              className="flex-1 bg-transparent px-5 py-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              className="bg-primary px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground transition hover:bg-foreground"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

