import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Bilal Garments" },
      { name: "description", content: "Bilal Garments is a Lahore-based contemporary clothing house designing premium ready-to-wear." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="container-bg py-16 md:py-24 max-w-4xl">
      <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">Our story</div>
      <h1 className="display text-5xl md:text-7xl mb-10">Made bold,<br />in Lahore.</h1>
      <div className="prose prose-neutral max-w-none text-lg leading-relaxed text-muted-foreground space-y-6">
        <p>
          Bilal Garments is a contemporary clothing house designing premium ready-to-wear for those who refuse to blend in.
          We believe great clothes are quiet acts of confidence — pieces that feel as bold as the people who wear them.
        </p>
        <p>
          Every collection is designed in our Lahore studio and produced in small runs by master tailors using considered
          fabrics. We collaborate with mills and finishers we trust, and we keep our supply chain close.
        </p>
        <p>
          What started as a tailoring shop in 2014 is now a brand worn across Pakistan and beyond — but the obsession
          stays the same: the perfect cut, the perfect cloth, made the right way.
        </p>
      </div>

      <div className="mt-16 grid sm:grid-cols-3 gap-8">
        <Stat k="11+" v="Years crafting" />
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
      <div className="text-xs uppercase tracking-widest text-muted-foreground mt-2">{v}</div>
    </div>
  );
}
