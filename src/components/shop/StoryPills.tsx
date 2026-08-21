import { Link } from "@tanstack/react-router";
import catWomen from "@/assets/cat-women.jpg";
import catMen from "@/assets/cat-men.jpg";
import catKids from "@/assets/cat-kids.jpg";
import catAcc from "@/assets/cat-acc.jpg";
import heroImg from "@/assets/hero.jpg";
import pJacket from "@/assets/p-jacket.jpg";

export interface StoryPillItem {
  id: string;
  label: string;
  image: string;
  to: string;
  params?: Record<string, string>;
  isSale?: boolean;
}

const defaultStoryItems: StoryPillItem[] = [
  {
    id: "women-unstitched",
    label: "Unstitched",
    image: catWomen,
    to: "/category/$slug",
    params: { slug: "women" },
  },
  {
    id: "ready-to-wear",
    label: "Ready to Wear",
    image: heroImg,
    to: "/category/$slug",
    params: { slug: "women" },
  },
  {
    id: "men-polos",
    label: "Men's Polos",
    image: catMen,
    to: "/category/$slug",
    params: { slug: "men" },
  },
  {
    id: "men-eastern",
    label: "Eastern Kurta",
    image: pJacket,
    to: "/category/$slug",
    params: { slug: "men" },
  },
  {
    id: "kids-apparel",
    label: "Kids Drop",
    image: catKids,
    to: "/category/$slug",
    params: { slug: "kids" },
  },
  {
    id: "accessories",
    label: "Accessories",
    image: catAcc,
    to: "/category/$slug",
    params: { slug: "accessories" },
  },
  {
    id: "sale-markowns",
    label: "Special Sale",
    image: catWomen,
    to: "/sale",
    isSale: true,
  },
];

export function StoryPills({ items = defaultStoryItems }: { items?: StoryPillItem[] }) {
  return (
    <section className="border-b border-border/70 bg-background/50 py-8 sm:py-10" aria-label="Top Collections Nationwide">
      <div className="container-bg">
        {/* Section Heading matching Zellbury */}
        <div className="mb-6 text-center sm:mb-8">
          <h2 className="display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Top Collections Nationwide
          </h2>
          <p className="mt-1 text-xs text-muted-foreground uppercase tracking-widest">
            Fast 1-Tap Category Filter
          </p>
        </div>

        <div className="flex items-center gap-5 sm:gap-8 overflow-x-auto pb-2 scrollbar-none justify-start md:justify-center">
          {items.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              params={item.params}
              className="group flex flex-col items-center shrink-0 cursor-pointer text-center focus:outline-none"
            >
              {/* Circular Avatar with Gradient Ring */}
              <div
                className={`relative h-20 w-20 sm:h-24 sm:w-24 rounded-full p-[2.5px] transition-transform duration-300 group-hover:scale-105 ${
                  item.isSale
                    ? "bg-gradient-to-tr from-sale via-accent to-sale shadow-md"
                    : "bg-gradient-to-tr from-border via-muted-foreground/40 to-border group-hover:from-accent group-hover:to-foreground"
                }`}
              >
                <div className="h-full w-full overflow-hidden rounded-full border-2 border-background bg-secondary">
                  <img
                    src={item.image}
                    alt={item.label}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
              </div>

              {/* Label */}
              <span
                className={`mt-2.5 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
                  item.isSale ? "text-sale font-bold" : "text-foreground/90 group-hover:text-accent"
                }`}
              >
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
