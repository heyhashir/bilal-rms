import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingBag,
  Heart,
  User,
  Menu,
  Search,
  X,
  ChevronRight,
  MapPin,
  Package,
  Phone,
  MessageCircle,
  Instagram,
  Facebook,
  Youtube,
  Shirt,
  Sparkles,
  Tag,
  Glasses,
  Footprints,
  Layers,
  Flame,
} from "lucide-react";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { catalogApi } from "@/lib/catalog-api";
import type { StorefrontSettings } from "@/lib/catalog-types";
import { queryKeys } from "@/lib/query-keys";
import { useCart, useWishlist } from "@/store/cart";
import { site } from "@/config/site";
import catMen from "@/assets/cat-men.jpg";
import catWomen from "@/assets/cat-women.jpg";
import catKids from "@/assets/cat-kids.jpg";
import catAcc from "@/assets/cat-acc.jpg";
import heroImg from "@/assets/hero.jpg";
import pJacket from "@/assets/p-jacket.jpg";

const fallbackSettings: StorefrontSettings = {
  id: "fallback",
  name: site.name,
  logoPrimaryText: "BALY",
  logoSecondaryText: "By Bilal Garments",
  logoTertiaryText: "EST 2001",
  promoRibbonText: `Free shipping over Rs. ${site.shipping.freeAbove.toLocaleString()}\nNew drop\nSummer '26 collection live now\nCOD available across Pakistan\nEasy 7-day returns`,
  promoRibbonItems: [
    `Free shipping over Rs. ${site.shipping.freeAbove.toLocaleString()}`,
    "New Summer '26 Drop",
    "Cash On Delivery Across Pakistan",
    "Easy 7-Day Returns & Exchange",
  ],
  tagline: site.tagline,
  description: site.description,
  email: site.email,
  phone: site.phone,
  address: site.address,
  taxNumber: "",
  receiptLogoPath: "",
  currency: site.currency,
  currencySymbol: site.currencySymbol,
  invoicePrefix: "BALY",
  receiptPrefix: "BALY",
  thermalHeader: "",
  thermalFooter: "",
  receiptThankYou: "Thank you for shopping with us!",
  guaranteePolicy: "Due items will be replaced within 2 days.",
  exchangePolicy: "",
  returnPolicy: "",
  saleItemPolicy: "No Return - No Exchange on Sale Items",
  receiptNotes: "Please keep this receipt for exchange or warranty.",
  barcodePrefix: "BALY",
  qrPrefix: "BALYQ",
  barcodeLabelTemplate: "branded",
  whatsapp: site.social.whatsapp,
  instagram: site.social.instagram,
  facebook: site.social.facebook,
  tiktok: site.social.tiktok,
  youtube: site.social.youtube,
  metaTitle: site.name,
  metaDescription: site.description,
};

function getWhatsAppUrl(val?: string) {
  if (!val) return "";
  const trimmed = val.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const digits = trimmed.replace(/[^0-9]/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.67 6.34 6.34 0 0 0 9.34 22a6.34 6.34 0 0 0 6.34-6.33V9.05a8.16 8.16 0 0 0 4.91 1.63V7.23a4.71 4.71 0 0 1-1-.54z" />
    </svg>
  );
}


type MenuCategoryItem = {
  label: string;
  to: string;
  params?: Record<string, string>;
  icon: React.ReactNode;
  isSpecial?: boolean;
};

const menuCategoriesByGender: Record<"men" | "women" | "kids", MenuCategoryItem[]> = {
  men: [
    { label: "Eastern Wear (Kurta)", to: "/category/$slug", params: { slug: "men" }, icon: <Shirt className="h-4 w-4" /> },
    { label: "T-Shirts & Polos", to: "/category/$slug", params: { slug: "men" }, icon: <Flame className="h-4 w-4" /> },
    { label: "Casual & Formal Shirts", to: "/category/$slug", params: { slug: "men" }, icon: <Shirt className="h-4 w-4" /> },
    { label: "Trousers & Chinos", to: "/category/$slug", params: { slug: "men" }, icon: <Layers className="h-4 w-4" /> },
    { label: "Unstitched Fabric", to: "/category/$slug", params: { slug: "men" }, icon: <Sparkles className="h-4 w-4" /> },
    { label: "Outerwear & Jackets", to: "/category/$slug", params: { slug: "men" }, icon: <Shirt className="h-4 w-4" /> },
    { label: "Footwear", to: "/shop", icon: <Footprints className="h-4 w-4" /> },
    { label: "Fragrance & Accessories", to: "/category/$slug", params: { slug: "accessories" }, icon: <Glasses className="h-4 w-4" /> },
    { label: "Special Sale Drop", to: "/sale", icon: <Tag className="h-4 w-4 text-sale" />, isSpecial: true },
  ],
  women: [
    { label: "Unstitched Summer Lawn", to: "/category/$slug", params: { slug: "women" }, icon: <Sparkles className="h-4 w-4" /> },
    { label: "Ready to Wear (Pret)", to: "/category/$slug", params: { slug: "women" }, icon: <Shirt className="h-4 w-4" /> },
    { label: "Printed & Solid Co-Ords", to: "/category/$slug", params: { slug: "women" }, icon: <Flame className="h-4 w-4" /> },
    { label: "Bottoms & Tights", to: "/category/$slug", params: { slug: "women" }, icon: <Layers className="h-4 w-4" /> },
    { label: "Dupattas & Shawls", to: "/category/$slug", params: { slug: "women" }, icon: <Sparkles className="h-4 w-4" /> },
    { label: "Footwear", to: "/shop", icon: <Footprints className="h-4 w-4" /> },
    { label: "Accessories & Bags", to: "/category/$slug", params: { slug: "accessories" }, icon: <Glasses className="h-4 w-4" /> },
    { label: "Special Sale Drop", to: "/sale", icon: <Tag className="h-4 w-4 text-sale" />, isSpecial: true },
  ],
  kids: [
    { label: "Boys Eastern Wear", to: "/category/$slug", params: { slug: "kids" }, icon: <Shirt className="h-4 w-4" /> },
    { label: "Boys Western & Tees", to: "/category/$slug", params: { slug: "kids" }, icon: <Flame className="h-4 w-4" /> },
    { label: "Girls Eastern & Frocks", to: "/category/$slug", params: { slug: "kids" }, icon: <Sparkles className="h-4 w-4" /> },
    { label: "Girls Western Wear", to: "/category/$slug", params: { slug: "kids" }, icon: <Shirt className="h-4 w-4" /> },
    { label: "Kids Accessories", to: "/category/$slug", params: { slug: "kids" }, icon: <Glasses className="h-4 w-4" /> },
    { label: "Special Sale Drop", to: "/sale", icon: <Tag className="h-4 w-4 text-sale" />, isSpecial: true },
  ],
};

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeGender, setActiveGender] = useState<"men" | "women" | "kids">("men");

  const cartCount = useCart((s) => s.lines.reduce((a, l) => a + l.qty, 0));
  const wishCount = useWishlist((s) => s.ids.length);
  const { data: user } = useCurrentUser();
  const settingsQuery = useQuery({
    queryKey: queryKeys.catalog.settings,
    queryFn: catalogApi.settings,
  });
  const settings = settingsQuery.data?.settings ?? fallbackSettings;
  const promoItems = settings.promoRibbonItems.length > 0 ? settings.promoRibbonItems : fallbackSettings.promoRibbonItems;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 transition-colors">
        {/* Top Marquee Announcement Bar */}
        <div className="bg-primary text-[11px] uppercase tracking-[0.2em] text-primary-foreground">
          <div className="container-bg overflow-hidden py-1.5">
            <div className="marquee">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className={`marquee-copy ${i === 1 ? "marquee-copy--duplicate" : ""}`}
                  aria-hidden={i === 1}
                >
                  {promoItems.map((item, index) => (
                    <span key={`${i}-${index}-${item}`}>
                      {index > 0 ? "· " : ""}
                      {item}
                      {index < promoItems.length - 1 ? " ·" : ""}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Navigation Bar - Full Width Edge-to-Edge Floating Capsule */}
        <div className="w-full px-2 sm:px-4 md:px-6 py-2 sm:py-2.5">
          <div className="flex min-h-[60px] sm:min-h-[68px] w-full items-center justify-between gap-3 sm:gap-4 rounded-full border border-border/85 bg-background/90 px-4 sm:px-8 shadow-sm backdrop-blur-md">
            {/* Left Menu Toggle */}
            <div className="flex items-center">
              <button
                onClick={() => setMenuOpen(true)}
                className="flex items-center gap-2 rounded-full p-2 text-foreground hover:text-accent transition-colors focus:outline-none"
                aria-label="Open Navigation Menu"
              >
                <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Menu</span>
              </button>
            </div>

            {/* Centered Brand Logo */}
            <div className="flex justify-center text-center">
              <Link to="/" className="inline-block text-foreground transition-transform hover:scale-[1.02]">
                <BrandMark settings={settings} variant="header" />
              </Link>
            </div>

            {/* Right Options (Search, Account, Wishlist, Bag with Icons & Text) */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* 1. Search */}
              <Link
                to="/search"
                className="flex items-center gap-1.5 rounded-full px-2 sm:px-2.5 py-1.5 text-xs font-medium text-foreground hover:text-accent transition-colors"
                aria-label="Search Catalog"
              >
                <Search className="h-4 w-4" />
                <span className="hidden md:inline text-[11px] font-semibold uppercase tracking-wider">Search</span>
              </Link>

              {/* 2. Account */}
              <Link
                to={user ? "/account" : "/login"}
                className="flex items-center gap-1.5 rounded-full px-2 sm:px-2.5 py-1.5 text-xs font-medium text-foreground hover:text-accent transition-colors"
                aria-label="Account / Sign In"
              >
                <User className="h-4 w-4" />
                <span className="hidden md:inline text-[11px] font-semibold uppercase tracking-wider">Account</span>
              </Link>

              {/* 3. Wishlist */}
              <Link
                to="/wishlist"
                className="relative flex items-center gap-1.5 rounded-full px-2 sm:px-2.5 py-1.5 text-xs font-medium text-foreground hover:text-accent transition-colors"
                aria-label="Wishlist"
              >
                <Heart className="h-4 w-4" />
                <span className="hidden md:inline text-[11px] font-semibold uppercase tracking-wider">Wishlist</span>
                {wishCount > 0 && <Badge n={wishCount} />}
              </Link>

              {/* 4. Bag / Cart */}
              <Link
                to="/cart"
                className="relative flex items-center gap-1.5 rounded-full px-2 sm:px-2.5 py-1.5 text-xs font-medium text-foreground hover:text-accent transition-colors"
                aria-label="Shopping Bag"
              >
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden md:inline text-[11px] font-semibold uppercase tracking-wider">Bag</span>
                {cartCount > 0 && <Badge n={cartCount} />}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* Zellbury-Style Left Side Menu Drawer                                      */}
      {/* ========================================================================= */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative z-10 flex h-full w-full max-w-[380px] sm:max-w-[420px] flex-col bg-background text-foreground shadow-2xl animate-in slide-in-from-left duration-300">
            {/* Top Promo Banner Cards (Horizontally Scrollable) inside Drawer */}
            <div className="relative bg-secondary/80 p-4 border-b border-border/80">
              {/* Close Button */}
              <button
                onClick={() => setMenuOpen(false)}
                className="absolute right-3 top-3 z-20 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white transition hover:bg-black"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="pt-6">
                <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none snap-x">
                  <Link
                    to="/category/$slug"
                    params={{ slug: "men" }}
                    onClick={() => setMenuOpen(false)}
                    className="group relative w-32 sm:w-36 shrink-0 aspect-[16/10] overflow-hidden rounded-sm bg-black snap-start"
                  >
                    <img
                      src={catMen}
                      alt="Eastern Wear"
                      className="h-full w-full object-cover opacity-85 transition group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-2 text-white">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Eastern Wear</span>
                    </div>
                  </Link>

                  <Link
                    to="/shop"
                    onClick={() => setMenuOpen(false)}
                    className="group relative w-32 sm:w-36 shrink-0 aspect-[16/10] overflow-hidden rounded-sm bg-black snap-start"
                  >
                    <img
                      src={pJacket}
                      alt="Graphic Tees & Drops"
                      className="h-full w-full object-cover opacity-85 transition group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-2 text-white">
                      <span className="text-[10px] font-bold uppercase tracking-wider">T-Shirts & Drop</span>
                    </div>
                  </Link>

                  <Link
                    to="/category/$slug"
                    params={{ slug: "women" }}
                    onClick={() => setMenuOpen(false)}
                    className="group relative w-32 sm:w-36 shrink-0 aspect-[16/10] overflow-hidden rounded-sm bg-black snap-start"
                  >
                    <img
                      src={catWomen}
                      alt="Summer Lawn '26"
                      className="h-full w-full object-cover opacity-85 transition group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-2 text-white">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Summer Lawn</span>
                    </div>
                  </Link>

                  <Link
                    to="/category/$slug"
                    params={{ slug: "women" }}
                    onClick={() => setMenuOpen(false)}
                    className="group relative w-32 sm:w-36 shrink-0 aspect-[16/10] overflow-hidden rounded-sm bg-black snap-start"
                  >
                    <img
                      src={heroImg}
                      alt="Pret Co-Ords"
                      className="h-full w-full object-cover opacity-85 transition group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-2 text-white">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Pret Co-Ords</span>
                    </div>
                  </Link>

                  <Link
                    to="/category/$slug"
                    params={{ slug: "kids" }}
                    onClick={() => setMenuOpen(false)}
                    className="group relative w-32 sm:w-36 shrink-0 aspect-[16/10] overflow-hidden rounded-sm bg-black snap-start"
                  >
                    <img
                      src={catKids}
                      alt="Kids Drop"
                      className="h-full w-full object-cover opacity-85 transition group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-2 text-white">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Kids Drop</span>
                    </div>
                  </Link>

                  <Link
                    to="/sale"
                    onClick={() => setMenuOpen(false)}
                    className="group relative w-32 sm:w-36 shrink-0 aspect-[16/10] overflow-hidden rounded-sm bg-black snap-start"
                  >
                    <img
                      src={catAcc}
                      alt="Special Sale"
                      className="h-full w-full object-cover opacity-85 transition group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-sale/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-2 text-white">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sale">Special Sale</span>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Demographic Tabs: Men | Women | Kids */}
            <div className="grid grid-cols-3 border-b border-border text-center">
              {(["men", "women", "kids"] as const).map((gender) => {
                const isActive = activeGender === gender;
                return (
                  <button
                    key={gender}
                    onClick={() => setActiveGender(gender)}
                    className={`py-3.5 text-xs font-bold uppercase tracking-[0.2em] transition-all relative ${
                      isActive
                        ? "text-foreground font-black after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-accent"
                        : "text-muted-foreground hover:text-foreground bg-secondary/30"
                    }`}
                  >
                    {gender}
                  </button>
                );
              })}
            </div>

            {/* Category List */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin">
              {menuCategoriesByGender[activeGender].map((item, index) => (
                <Link
                  key={`${item.label}-${index}`}
                  to={item.to}
                  params={item.params}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-3 rounded-none text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
                    item.isSpecial
                      ? "bg-sale/10 text-sale font-bold hover:bg-sale/20"
                      : "text-foreground/90 hover:bg-secondary hover:text-accent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
                </Link>
              ))}
            </div>

            {/* Customer Care Section */}
            {Boolean(
              settings.whatsapp ||
              settings.phone ||
              settings.instagram ||
              settings.facebook ||
              settings.tiktok ||
              settings.youtube
            ) && (
              <div className="border-t border-border/80 bg-secondary/30 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Customer Care
                  </span>
                  <div className="flex items-center gap-2.5">
                    {getWhatsAppUrl(settings.whatsapp) && (
                      <a
                        href={getWhatsAppUrl(settings.whatsapp)}
                        target="_blank"
                        rel="noreferrer"
                        className="grid h-7 w-7 place-items-center rounded-full bg-background border border-border text-foreground hover:text-accent transition-colors"
                        aria-label="WhatsApp Support"
                        title="WhatsApp"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {settings.phone && (
                      <a
                        href={`tel:${settings.phone.replace(/[^0-9+]/g, "")}`}
                        className="grid h-7 w-7 place-items-center rounded-full bg-background border border-border text-foreground hover:text-accent transition-colors"
                        aria-label="Phone Support"
                        title="Call us"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {settings.instagram && (
                      <a
                        href={settings.instagram}
                        target="_blank"
                        rel="noreferrer"
                        className="grid h-7 w-7 place-items-center rounded-full bg-background border border-border text-foreground hover:text-accent transition-colors"
                        aria-label="Instagram"
                        title="Instagram"
                      >
                        <Instagram className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {settings.facebook && (
                      <a
                        href={settings.facebook}
                        target="_blank"
                        rel="noreferrer"
                        className="grid h-7 w-7 place-items-center rounded-full bg-background border border-border text-foreground hover:text-accent transition-colors"
                        aria-label="Facebook"
                        title="Facebook"
                      >
                        <Facebook className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {settings.tiktok && (
                      <a
                        href={settings.tiktok}
                        target="_blank"
                        rel="noreferrer"
                        className="grid h-7 w-7 place-items-center rounded-full bg-background border border-border text-foreground hover:text-accent transition-colors"
                        aria-label="TikTok"
                        title="TikTok"
                      >
                        <TikTokIcon className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {settings.youtube && (
                      <a
                        href={settings.youtube}
                        target="_blank"
                        rel="noreferrer"
                        className="grid h-7 w-7 place-items-center rounded-full bg-background border border-border text-foreground hover:text-accent transition-colors"
                        aria-label="YouTube"
                        title="YouTube"
                      >
                        <Youtube className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom 3-Button Utility Bar: Stores | Tracking | Contact */}
            <div className="grid grid-cols-3 border-t border-border bg-secondary/80 text-center">
              <Link
                to="/about"
                onClick={() => setMenuOpen(false)}
                className="flex flex-col items-center gap-1 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border-r border-border/60"
              >
                <MapPin className="h-4 w-4" />
                <span>Stores</span>
              </Link>
              <Link
                to="/track-order"
                onClick={() => setMenuOpen(false)}
                className="flex flex-col items-center gap-1 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border-r border-border/60"
              >
                <Package className="h-4 w-4" />
                <span>Tracking</span>
              </Link>
              <Link
                to="/contact"
                onClick={() => setMenuOpen(false)}
                className="flex flex-col items-center gap-1 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Phone className="h-4 w-4" />
                <span>Contact</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BrandMark({ settings, variant }: { settings: StorefrontSettings; variant: "header" | "footer" }) {
  const isHeader = variant === "header";

  return (
    <span className={`inline-flex flex-col ${isHeader ? "leading-none" : "leading-[1.05]"}`}>
      <span className="flex items-end gap-2">
        <span
          className={`font-black uppercase tracking-[0.28em] text-primary ${
            isHeader ? "text-[1.6rem] sm:text-[1.8rem]" : "text-[1.55rem]"
          }`}
        >
          {settings.logoPrimaryText}
        </span>
        <span
          className={`mb-1 inline-block bg-accent ${
            isHeader ? "h-2.5 w-2.5 sm:h-3 sm:w-3" : "h-2.5 w-2.5"
          }`}
        />
      </span>
      <span
        className={`mt-1 font-semibold uppercase text-foreground/78 ${
          isHeader ? "text-[0.5rem] tracking-[0.34em] sm:text-[0.58rem]" : "text-[0.58rem] tracking-[0.34em]"
        }`}
      >
        {settings.logoSecondaryText}
      </span>
      <span
        className={`mt-1 font-medium uppercase text-accent ${
          isHeader ? "text-[0.46rem] tracking-[0.42em] sm:text-[0.52rem]" : "text-[0.52rem] tracking-[0.42em]"
        }`}
      >
        {settings.logoTertiaryText}
      </span>
    </span>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
      {n}
    </span>
  );
}

export function Footer() {
  const settingsQuery = useQuery({
    queryKey: queryKeys.catalog.settings,
    queryFn: catalogApi.settings,
  });
  const settings = settingsQuery.data?.settings ?? fallbackSettings;
  const catalogQuery = useQuery({
    queryKey: queryKeys.catalog.bootstrap,
    queryFn: catalogApi.bootstrap,
  });
  const categories = catalogQuery.data?.categories ?? [];
  const products = catalogQuery.data?.products ?? [];
  const visibleCategories = categories
    .map((category) => ({
      ...category,
      children: category.children.filter((child) => products.some((product) => product.category === child.slug)),
    }))
    .filter(
      (category) =>
        products.some((product) => product.category === category.slug) || category.children.length > 0,
    );

  return (
    <footer className="mt-24 border-t border-border bg-secondary">
      <div className="container-bg grid gap-12 py-16 md:grid-cols-4">
        <div>
          <BrandMark settings={settings} variant="footer" />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">{settings.description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {getWhatsAppUrl(settings.whatsapp) && (
              <a
                href={getWhatsAppUrl(settings.whatsapp)}
                target="_blank"
                rel="noreferrer"
                className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                aria-label="WhatsApp"
                title="WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            )}
            {settings.instagram && (
              <a
                href={settings.instagram}
                target="_blank"
                rel="noreferrer"
                className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                aria-label="Instagram"
                title="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {settings.facebook && (
              <a
                href={settings.facebook}
                target="_blank"
                rel="noreferrer"
                className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                aria-label="Facebook"
                title="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
            )}
            {settings.tiktok && (
              <a
                href={settings.tiktok}
                target="_blank"
                rel="noreferrer"
                className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                aria-label="TikTok"
                title="TikTok"
              >
                <TikTokIcon className="h-4 w-4" />
              </a>
            )}
            {settings.youtube && (
              <a
                href={settings.youtube}
                target="_blank"
                rel="noreferrer"
                className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                aria-label="YouTube"
                title="YouTube"
              >
                <Youtube className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
        <FooterCol
          title="Shop"
          items={visibleCategories.flatMap((category) => [
            { to: `/category/${category.slug}`, label: category.name },
            ...category.children.map((child) => ({ to: `/category/${child.slug}`, label: `${category.name} / ${child.name}` })),
          ])}
        />
        <FooterCol
          title="Help"
          items={[
            { to: "/about", label: "About" },
            { to: "/contact", label: "Contact" },
            { to: "/track-order", label: "Track order" },
            { to: "/faq", label: "FAQ" },
            { to: "/refund-policy", label: "Refund policy" },
            { to: "/privacy", label: "Privacy" },
            { to: "/terms", label: "Terms" },
          ]}
        />
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest">Newsletter</h4>
          <p className="mb-3 text-sm text-muted-foreground">Get 10% off your first order.</p>
          <form
            className="flex border border-border bg-background"
            onSubmit={(e) => {
              e.preventDefault();
              alert("Thanks for subscribing!");
              (e.currentTarget as HTMLFormElement).reset();
            }}
          >
            <input
              type="email"
              required
              placeholder="Email address"
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
            />
            <button className="bg-primary px-4 text-xs uppercase tracking-widest text-primary-foreground">
              Join
            </button>
          </form>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-bg flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} {settings.name}. All rights reserved.</span>
          <span>{settings.address} · {settings.email}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: { to: string; label: string }[] }) {
  return (
    <div>
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest">{title}</h4>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i.to}>
            <Link to={i.to} className="hover:text-foreground">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
