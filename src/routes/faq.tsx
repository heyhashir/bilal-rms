import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [{ title: "FAQ — Bilal Garments" }, { name: "description", content: "Answers to common questions about orders, shipping and returns." }] }),
  component: FAQ,
});

const FAQS = [
  { q: "How long does delivery take?", a: "Orders across Pakistan are typically delivered within 3–5 business days. Metro cities (Lahore, Karachi, Islamabad) usually receive orders within 48 hours." },
  { q: "What is your return policy?", a: "You may return unworn items within 7 days of delivery for a full refund. Sale items and undergarments are final sale." },
  { q: "Do you offer cash on delivery?", a: "Yes. Cash on delivery is available across Pakistan for orders under Rs. 30,000." },
  { q: "How can I track my order?", a: "Use the Track order page and enter your order ID with the email you used to place the order." },
  { q: "How do I know my size?", a: "Every product page includes a detailed size chart. If you're between sizes, size up for a relaxed fit." },
  { q: "Can I change or cancel my order?", a: "Changes and cancellations are possible while the order status is Pending. Contact support as soon as possible." },
  { q: "Do you ship internationally?", a: "Not currently — we ship within Pakistan only. International shipping is coming soon." },
  { q: "How do I care for my Bilal Garments pieces?", a: "Cold hand-wash, air dry in shade. Refer to the care label inside each garment for material-specific instructions." },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="container-bg py-12 md:py-20 max-w-3xl">
      <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Support</div>
      <h1 className="display text-4xl md:text-5xl mb-10">Frequently asked.</h1>
      <div className="border-t border-border">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="border-b border-border">
              <button onClick={() => setOpen(isOpen ? null : i)} className="w-full flex items-center justify-between text-left py-5 gap-4">
                <span className="display text-lg">{f.q}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              <div className={`overflow-hidden transition-[max-height,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                <p className="text-sm text-muted-foreground pb-5">{f.a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
