import { Banknote, RotateCcw, ShieldCheck, Truck } from "lucide-react";

export function TrustBadges() {
  const perks = [
    {
      icon: <Truck className="h-6 w-6 text-accent" />,
      title: "Free Shipping",
      description: "Nationwide delivery on all orders over Rs. 3,000",
    },
    {
      icon: <Banknote className="h-6 w-6 text-accent" />,
      title: "Cash On Delivery",
      description: "Pay conveniently at your doorstep across 150+ cities",
    },
    {
      icon: <RotateCcw className="h-6 w-6 text-accent" />,
      title: "7-Day Easy Exchange",
      description: "Hassle-free size replacement and returns policy",
    },
    {
      icon: <ShieldCheck className="h-6 w-6 text-accent" />,
      title: "Premium Quality",
      description: "100% authentic fabrics crafted with precision",
    },
  ];

  return (
    <section className="border-y border-border/80 bg-secondary/40 py-12 md:py-16" aria-label="Why Shop With Us">
      <div className="container-bg">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {perks.map((perk, index) => (
            <div key={index} className="flex items-start gap-4 p-4 border border-border/50 bg-background/70 shadow-sm transition hover:border-accent">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-none bg-secondary/80 border border-border">
                {perk.icon}
              </div>
              <div>
                <h4 className="text-sm font-bold uppercase tracking-[0.14em] text-foreground">
                  {perk.title}
                </h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {perk.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
