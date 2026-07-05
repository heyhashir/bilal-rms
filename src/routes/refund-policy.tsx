import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({ meta: [{ title: "Refund policy — Bilal Garments" }, { name: "description", content: "Our simple, transparent return and refund policy." }] }),
  component: RefundPolicy,
});

function RefundPolicy() {
  return (
    <div className="container-bg py-12 md:py-20 max-w-3xl">
      <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Legal</div>
      <h1 className="display text-4xl md:text-5xl mb-8">Refund policy.</h1>
      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
        <Section title="Eligibility">
          <p>You may return unworn, unwashed items with original tags within 7 days of delivery. Sale items, innerwear and accessories are final sale.</p>
        </Section>
        <Section title="How to start a return">
          <p>Email hello@bilalgarments.pk with your order ID and reason. Our support team will approve the return within one business day.</p>
        </Section>
        <Section title="Refund timeline">
          <p>Once the returned item passes inspection, refunds are issued within 5–7 business days to the original payment method. COD refunds are issued via bank transfer or store credit.</p>
        </Section>
        <Section title="Exchanges">
          <p>Free exchanges for size or colour, subject to availability. The exchange item ships as soon as we receive the original.</p>
        </Section>
        <Section title="Damaged or wrong item">
          <p>If your order arrives damaged or wrong, contact us within 48 hours and we'll cover return shipping and issue a full refund or replacement.</p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="display text-xl text-foreground mb-3">{title}</h2>
      {children}
    </section>
  );
}
