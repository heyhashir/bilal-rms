import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { site } from "@/config/site";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Bilal Garments" },
      { name: "description", content: "Get in touch with Bilal Garments customer care, wholesale, and press." },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <div className="container-bg py-16 md:py-24">
      <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">Contact</div>
      <h1 className="display text-5xl md:text-7xl mb-12">Say hello.</h1>
      <div className="grid lg:grid-cols-2 gap-12">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            toast.success("Message sent. We'll be in touch.");
            (e.currentTarget as HTMLFormElement).reset();
          }}
          className="space-y-4"
        >
          <Field label="Your name" />
          <Field label="Email" type="email" />
          <Field label="Subject" />
          <Field label="Message" textarea />
          <button className="bg-primary text-primary-foreground px-8 py-4 text-xs uppercase tracking-[0.2em]">Send message</button>
        </form>
        <div className="space-y-6">
          <Card icon={<Mail className="h-4 w-4" />} title="Email" value={site.email} />
          <Card icon={<Phone className="h-4 w-4" />} title="Phone" value={site.phone} />
          <Card icon={<MapPin className="h-4 w-4" />} title="Studio" value={site.address} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, type = "text", textarea }: { label: string; type?: string; textarea?: boolean }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      {textarea ? (
        <textarea required rows={5} className="w-full border border-border bg-background px-3 py-3 text-sm outline-none focus:border-foreground resize-none" />
      ) : (
        <input required type={type} className="w-full border border-border bg-background px-3 py-3 text-sm outline-none focus:border-foreground" />
      )}
    </label>
  );
}

function Card({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="border border-border p-6">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-2">{icon} {title}</div>
      <div className="text-lg">{value}</div>
    </div>
  );
}
