import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import catWomen from "@/assets/cat-women.jpg";
import catMen from "@/assets/cat-men.jpg";
import catKids from "@/assets/cat-kids.jpg";
import catAcc from "@/assets/cat-acc.jpg";
import heroImg from "@/assets/hero.jpg";

export function CampaignTiles() {
  return (
    <section className="container-bg py-16 md:py-24" aria-label="Curated Campaigns">
      {/* Section Heading */}
      <div className="mb-10 text-center md:mb-14">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-accent">
          Curated Collections
        </div>
        <h2 className="display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
          Shop By Campaign
        </h2>
        <div className="mx-auto mt-3 h-0.5 w-16 bg-accent" />
      </div>

      {/* Primary 2-Column High-Impact Tiles */}
      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        {/* Tile 1: Women */}
        <Link
          to="/category/$slug"
          params={{ slug: "women" }}
          className="group relative aspect-[4/5] sm:aspect-[16/11] md:aspect-[4/5] overflow-hidden bg-secondary shadow-lg"
        >
          <img
            src={catWomen}
            alt="Women's Summer Collection"
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-start p-6 sm:p-8 md:p-10 text-white">
            <span className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-accent">
              Summer '26 Drop
            </span>
            <h3 className="display text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
              Women's Unstitched & Pret
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-white/80 line-clamp-2 max-w-md">
              Intricate prints, breathable lawns, and luxury embroidered formal ensembles.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 border border-white/80 bg-white/10 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.2em] backdrop-blur-md transition group-hover:bg-white group-hover:text-black">
              Discover Now <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        </Link>

        {/* Tile 2: Men */}
        <Link
          to="/category/$slug"
          params={{ slug: "men" }}
          className="group relative aspect-[4/5] sm:aspect-[16/11] md:aspect-[4/5] overflow-hidden bg-secondary shadow-lg"
        >
          <img
            src={catMen}
            alt="Men's Collection"
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-start p-6 sm:p-8 md:p-10 text-white">
            <span className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-accent">
              Modern Casuals
            </span>
            <h3 className="display text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
              Men's Polos & Eastern Wear
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-white/80 line-clamp-2 max-w-md">
              Structured polos, tailored kurtas, waistcoats, and everyday wardrobe essentials.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 border border-white/80 bg-white/10 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.2em] backdrop-blur-md transition group-hover:bg-white group-hover:text-black">
              Explore Styles <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        </Link>
      </div>

      {/* Secondary 3-Column Supporting Tiles */}
      <div className="mt-6 sm:mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 md:gap-8">
        {/* Sub Tile 1: Ready to Wear */}
        <Link
          to="/shop"
          className="group relative aspect-[4/5] overflow-hidden bg-secondary shadow-md"
        >
          <img
            src={heroImg}
            alt="Ready to Wear Co-Ords"
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 text-white">
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent">Trending</div>
            <h4 className="display text-xl sm:text-2xl font-bold mt-1">Co-Ords & Solid Sets</h4>
            <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/90 group-hover:text-accent">
              Shop Sets →
            </span>
          </div>
        </Link>

        {/* Sub Tile 2: Kids */}
        <Link
          to="/category/$slug"
          params={{ slug: "kids" }}
          className="group relative aspect-[4/5] overflow-hidden bg-secondary shadow-md"
        >
          <img
            src={catKids}
            alt="Kids Collection"
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 text-white">
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent">Little Wardrobe</div>
            <h4 className="display text-xl sm:text-2xl font-bold mt-1">Kids Boys & Girls</h4>
            <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/90 group-hover:text-accent">
              Shop Kids →
            </span>
          </div>
        </Link>

        {/* Sub Tile 3: Accessories / Sale */}
        <Link
          to="/sale"
          className="group relative aspect-[4/5] overflow-hidden bg-secondary shadow-md sm:col-span-2 lg:col-span-1"
        >
          <img
            src={catAcc}
            alt="Special Sale Drop"
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 text-white">
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-sale">Special Offer</div>
            <h4 className="display text-xl sm:text-2xl font-bold mt-1">Exclusive Markdowns</h4>
            <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-sale group-hover:text-accent">
              Shop Markdowns →
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}
