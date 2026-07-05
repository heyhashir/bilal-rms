import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy policy — Bilal Garments" }, { name: "description", content: "How Bilal Garments collects, uses and protects your personal data." }] }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="container-bg py-12 md:py-20 max-w-3xl">
      <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Legal</div>
      <h1 className="display text-4xl md:text-5xl mb-8">Privacy policy.</h1>
      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
        <Section title="1. Information we collect">
          <p>We collect information you provide when creating an account, placing an order, or contacting support — including your name, email, phone number, shipping address and payment details.</p>
        </Section>
        <Section title="2. How we use your information">
          <p>Your information is used to process orders, deliver products, respond to enquiries, prevent fraud, and — with your consent — send marketing communications.</p>
        </Section>
        <Section title="3. Sharing with third parties">
          <p>We share information only with the couriers, payment processors and service providers required to fulfil your order. We never sell your personal information.</p>
        </Section>
        <Section title="4. Cookies">
          <p>We use functional cookies to keep you signed in and to remember your cart. Analytics cookies help us improve the site.</p>
        </Section>
        <Section title="5. Your rights">
          <p>You may request access to, correction of, or deletion of your data by emailing hello@bilalgarments.pk.</p>
        </Section>
        <Section title="6. Contact">
          <p>Bilal Garments · Lahore, Pakistan · hello@bilalgarments.pk</p>
        </Section>
        <p className="text-xs">Last updated {new Date().toLocaleDateString()}.</p>
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
