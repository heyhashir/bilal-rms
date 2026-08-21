import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import heroImg from "@/assets/hero.jpg";
import catWomen from "@/assets/cat-women.jpg";
import catMen from "@/assets/cat-men.jpg";
import catKids from "@/assets/cat-kids.jpg";
import pJacket from "@/assets/p-jacket.jpg";

export interface HeroSlide {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  ctaText: string;
  ctaLink: string;
  ctaParams?: Record<string, string>;
  ratingText?: string;
}

const defaultSlides: HeroSlide[] = [
  {
    id: "slide-pret",
    eyebrow: "— LOVED BY 100,000+ WOMEN",
    title: "Ready-to-Wear, Ready to Style",
    description: "Effortless styles designed for your everyday glow — no stitching, no waiting.",
    image: catWomen,
    ctaText: "SHOP PRET →",
    ctaLink: "/category/$slug",
    ctaParams: { slug: "women" },
    ratingText: "4.8/5 from 70,000+ reviews",
  },
  {
    id: "slide-eastern",
    eyebrow: "— TRUSTED BY MODERN GENTLEMEN",
    title: "Tradition Tailored to Perfection",
    description: "Classic eastern wear redefined with modern cuts, elevated details, and unmatched comfort.",
    image: catMen,
    ctaText: "SHOP MEN EASTERN →",
    ctaLink: "/category/$slug",
    ctaParams: { slug: "men" },
    ratingText: "4.9/5 from 120,000+ satisfied customers",
  },
  {
    id: "slide-lawn",
    eyebrow: "— SUMMER '26 SIGNATURE LAWN",
    title: "Elegance in Every Thread",
    description: "Premium breathable swiss lawns, artisanal embroideries, and vibrant digital printed dupattas.",
    image: heroImg,
    ctaText: "SHOP UNSTITCHED LAWN →",
    ctaLink: "/category/$slug",
    ctaParams: { slug: "women" },
    ratingText: "4.9/5 from 200,000+ happy shoppers",
  },
  {
    id: "slide-streetwear",
    eyebrow: "— EVERYDAY WARDROBE ESSENTIALS",
    title: "Wear Bold. Live Louder.",
    description: "Structured pique polos, heavy-cotton tees, and tailored chinos built for daily sophistication.",
    image: pJacket,
    ctaText: "SHOP CASUALS & POLOS →",
    ctaLink: "/shop",
    ratingText: "4.8/5 from 65,000+ active shoppers",
  },
  {
    id: "slide-kids",
    eyebrow: "— LITTLE FASHION, BIG CHARM",
    title: "Festive Smiles for Little Stars",
    description: "Vibrant ethnic kurtas, playful dresses, and comfortable party wear for boys and girls.",
    image: catKids,
    ctaText: "EXPLORE KIDS DROP →",
    ctaLink: "/category/$slug",
    ctaParams: { slug: "kids" },
    ratingText: "4.9/5 from 40,000+ loving parents",
  },
];

export function HeroSlider({ slides = defaultSlides }: { slides?: HeroSlide[] }) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToIndex = useCallback((index: number) => {
    if (!scrollRef.current) return;
    const width = scrollRef.current.clientWidth;
    scrollRef.current.scrollTo({
      left: index * width,
      behavior: "smooth",
    });
    setCurrent(index);
  }, []);

  const nextSlide = useCallback(() => {
    const nextIndex = (current + 1) % slides.length;
    scrollToIndex(nextIndex);
  }, [current, scrollToIndex, slides.length]);

  // Autoplay loop
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const timer = setInterval(nextSlide, 5500);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide, slides.length]);

  // Handle native scroll / swipe gestures
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const width = scrollRef.current.clientWidth;
    if (width > 0) {
      const activeIdx = Math.round(scrollLeft / width);
      if (activeIdx !== current && activeIdx >= 0 && activeIdx < slides.length) {
        setCurrent(activeIdx);
      }
    }
  };

  return (
    <section
      className="relative w-full overflow-hidden bg-zinc-950 text-white"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="Homepage Hero Carousel"
    >
      {/* Horizontally Scrollable & Touch-Swipeable Track */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex w-full h-[580px] sm:h-[660px] md:h-[740px] lg:h-[800px] overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-none scroll-smooth touch-pan-x"
      >
        {slides.map((slide, index) => {
          return (
            <div
              key={slide.id}
              className="relative w-full h-full shrink-0 min-w-full snap-center overflow-hidden bg-zinc-900"
            >
              {/* High-Resolution Background Image */}
              <img
                src={slide.image}
                alt={slide.title}
                className="h-full w-full object-cover object-top md:object-center"
              />

              {/* Dark Gradient Vignette for High-Contrast Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/30 md:bg-gradient-to-r md:from-black/90 md:via-black/60 md:to-transparent" />

              {/* Left-Aligned Zellbury-Style Content Box */}
              <div className="absolute inset-0 flex items-center z-20 pointer-events-none">
                <div className="container-bg w-full">
                  <div className="max-w-xl md:max-w-2xl text-left pointer-events-auto">
                    {/* Eyebrow Tag */}
                    <div className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-white/90">
                      {slide.eyebrow}
                    </div>

                    {/* Headline */}
                    <h1 className="display text-3xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight text-white drop-shadow-md">
                      {slide.title}
                    </h1>

                    {/* Subtitle / Description */}
                    <p className="mt-4 text-sm sm:text-base text-white/85 leading-relaxed max-w-lg drop-shadow-sm">
                      {slide.description}
                    </p>

                    {/* Primary CTA Pill Button */}
                    <div className="mt-8">
                      <Link
                        to={slide.ctaLink}
                        params={slide.ctaParams}
                        className="group inline-flex items-center gap-2 rounded-md border border-white/50 bg-black/50 backdrop-blur-md px-8 py-3.5 sm:py-4 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-xl transition hover:bg-white hover:text-black hover:border-white"
                      >
                        {slide.ctaText}
                      </Link>
                    </div>

                    {/* Star Rating & Social Proof */}
                    {slide.ratingText && (
                      <div className="mt-6 flex items-center gap-2 text-xs text-white/85 font-medium">
                        <div className="flex items-center text-amber-400">
                          {Array.from({ length: 5 }).map((_, starIndex) => (
                            <Star key={starIndex} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <span className="text-[11px] tracking-wide">{slide.ratingText}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Segmented Dash Progress Bars */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 w-full max-w-lg px-4 justify-center pointer-events-auto">
        {slides.map((_, index) => {
          const isActive = index === current;
          return (
            <button
              key={index}
              onClick={() => scrollToIndex(index)}
              aria-label={`Go to slide ${index + 1}`}
              className="group relative flex-1 py-2 cursor-pointer"
            >
              <div
                className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]"
                    : "bg-white/35 group-hover:bg-white/60"
                }`}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
