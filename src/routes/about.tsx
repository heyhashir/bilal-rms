import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About - BALI by Bilal Garments EST 2001." },
      { name: "description", content: "BALI by Bilal Garments EST 2001. is an Attock-based contemporary clothing house designing premium ready-to-wear." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="container-bg max-w-4xl py-16 md:py-24">
      <div className="mb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">Our story</div>
      <h1 className="display mb-10 text-5xl md:text-7xl">Made bold,<br />from Attock.</h1>
      <div className="prose prose-neutral max-w-none space-y-6 text-lg leading-relaxed text-muted-foreground">
        <p>
          BALI by Bilal Garments EST 2001. is a contemporary clothing house designing premium ready-to-wear for those who refuse to blend in.
          We believe great clothes are quiet acts of confidence, pieces that feel as bold as the people who wear them.
        </p>
        <p>
          Every collection is designed from our Attock base and produced in small runs by master tailors using considered
          fabrics. We collaborate with mills and finishers we trust, and we keep our supply chain close.
        </p>
        <p>
          What started as a tailoring shop in 2001 is now a brand worn across Pakistan and beyond, but the obsession
          stays the same: the perfect cut, the perfect cloth, made the right way.
        </p>
      </div>

      <div className="mt-16 grid gap-8 sm:grid-cols-3">
        <Stat k="25+" v="Years crafting" />
        <Stat k="50k+" v="Garments shipped" />
        <Stat k="120+" v="Cities reached" />
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="border-t border-border pt-4">
      <div className="display text-4xl">{k}</div>
      <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">{v}</div>
    </div>
  );
}
