import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms & conditions — Bilal Garments" }, { name: "description", content: "The terms governing your use of the Bilal Garments website." }] }),
  component: Terms,
});

function Terms() {
  return (
    <div className="container-bg py-12 md:py-20 max-w-3xl">
      <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Legal</div>
      <h1 className="display text-4xl md:text-5xl mb-8">Terms & conditions.</h1>
      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
        <Section title="1. Acceptance of terms">
          <p>By accessing or using bilalgarments.pk you agree to be bound by these terms. If you do not agree, please do not use the site.</p>
        </Section>
        <Section title="2. Products and pricing">
          <p>We reserve the right to modify product availability, pricing and specifications at any time. Colours may vary slightly from screen to reality.</p>
        </Section>
        <Section title="3. Orders">
          <p>Placing an order constitutes an offer to purchase. We may accept, decline or cancel any order at our discretion.</p>
        </Section>
        <Section title="4. Payments">
          <p>Accepted payment methods include cash on delivery, JazzCash, EasyPaisa and major credit/debit cards. All transactions are processed securely.</p>
        </Section>
        <Section title="5. Intellectual property">
          <p>All content on this site — imagery, text, logos and product designs — is the property of Bilal Garments and may not be reproduced without written permission.</p>
        </Section>
        <Section title="6. Liability">
          <p>To the extent permitted by law, Bilal Garments is not liable for indirect or consequential damages arising from the use of this site.</p>
        </Section>
        <Section title="7. Governing law">
          <p>These terms are governed by the laws of the Islamic Republic of Pakistan.</p>
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
