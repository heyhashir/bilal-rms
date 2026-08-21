import { Link } from "@tanstack/react-router";
import { Instagram } from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import catWomen from "@/assets/cat-women.jpg";
import catMen from "@/assets/cat-men.jpg";
import pJacket from "@/assets/p-jacket.jpg";

export function CommunityGallery() {
  const communityPosts = [
    {
      id: "post-1",
      image: heroImg,
      handle: "@fashion_pk",
      caption: "Sunny weekend in The Sunshine Coat ☀️ #SpottedInBALY",
    },
    {
      id: "post-2",
      image: catWomen,
      handle: "@aiman.style",
      caption: "Unstitched lawn perfection for the festive season ✨",
    },
    {
      id: "post-3",
      image: catMen,
      handle: "@hamza_k",
      caption: "Classic textured polo for the daily commute 👔",
    },
    {
      id: "post-4",
      image: pJacket,
      handle: "@zainab_looks",
      caption: "Layered elegance from the AW26 drop 🖤",
    },
  ];

  return (
    <section className="container-bg py-16 md:py-24" aria-label="Social Community Gallery">
      <div className="mb-10 text-center md:mb-12">
        <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-accent mb-2">
          <Instagram className="h-3.5 w-3.5" /> As Seen On You
        </div>
        <h2 className="display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
          #SpottedInBALY
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
          Tag <span className="font-semibold text-foreground">@bilalgarments</span> on Instagram to be featured.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4 md:gap-8">
        {communityPosts.map((post) => (
          <div key={post.id} className="group relative aspect-square overflow-hidden bg-secondary shadow-md">
            <img
              src={post.image}
              alt={post.caption}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex flex-col justify-between p-5 text-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">{post.handle}</span>
                <Instagram className="h-4 w-4" />
              </div>
              <p className="text-xs text-white/90 line-clamp-2">{post.caption}</p>
              <Link
                to="/shop"
                className="inline-block text-[11px] font-bold uppercase tracking-[0.18em] text-accent hover:underline"
              >
                Shop Look →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
