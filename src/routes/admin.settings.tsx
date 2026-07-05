import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSettings } from "@/store/settings";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const { settings, update, reset } = useSettings();
  const [s, setS] = useState(settings);

  const save = () => {
    update(s);
    toast.success("Settings saved");
  };

  return (
    <div className="space-y-10 max-w-3xl">
      <section>
        <h2 className="display text-2xl mb-5">Brand</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Brand name" value={s.name} onChange={(v) => setS({ ...s, name: v })} />
          <Field label="Tagline" value={s.tagline} onChange={(v) => setS({ ...s, tagline: v })} />
          <Field label="Description" value={s.description} onChange={(v) => setS({ ...s, description: v })} className="md:col-span-2" textarea />
        </div>
      </section>

      <section>
        <h2 className="display text-2xl mb-5">Contact</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Email" value={s.email} onChange={(v) => setS({ ...s, email: v })} />
          <Field label="Phone" value={s.phone} onChange={(v) => setS({ ...s, phone: v })} />
          <Field label="Address" value={s.address} onChange={(v) => setS({ ...s, address: v })} className="md:col-span-2" />
        </div>
      </section>

      <section>
        <h2 className="display text-2xl mb-5">Commerce</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="Currency symbol" value={s.currencySymbol} onChange={(v) => setS({ ...s, currencySymbol: v })} />
          <Field label="Flat shipping" type="number" value={String(s.shippingFlatRate)} onChange={(v) => setS({ ...s, shippingFlatRate: Number(v) })} />
          <Field label="Free shipping above" type="number" value={String(s.shippingFreeAbove)} onChange={(v) => setS({ ...s, shippingFreeAbove: Number(v) })} />
        </div>
      </section>

      <section>
        <h2 className="display text-2xl mb-5">Social</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="Instagram" value={s.instagram} onChange={(v) => setS({ ...s, instagram: v })} />
          <Field label="Facebook" value={s.facebook} onChange={(v) => setS({ ...s, facebook: v })} />
          <Field label="TikTok" value={s.tiktok} onChange={(v) => setS({ ...s, tiktok: v })} />
        </div>
      </section>

      <div className="flex gap-3">
        <button onClick={save} className="bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-widest">Save settings</button>
        <button onClick={() => { reset(); setS({ ...settings }); toast.success("Reset to defaults"); }} className="border border-border px-6 py-3 text-xs uppercase tracking-widest">Reset</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", textarea, className = "" }: { label: string; value: string; onChange: (v: string) => void; type?: string; textarea?: boolean; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
      )}
    </label>
  );
}
