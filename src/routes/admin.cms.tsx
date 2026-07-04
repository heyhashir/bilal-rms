import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2, Star } from "lucide-react";
import { useRetail, type Banner, type Hero, type Testimonial, newId } from "@/store/retail";
import { PageHeader, Tabs, ActionButton, Modal, Field, EmptyState, StatusPill } from "@/components/admin/primitives";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/cms")({
  component: AdminCMS,
});

const TABS = [
  { key: "banners", label: "Banners" },
  { key: "heroes", label: "Hero sections" },
  { key: "testimonials", label: "Testimonials" },
];

function AdminCMS() {
  const [tab, setTab] = useState("banners");
  return (
    <div>
      <PageHeader eyebrow="Website" title="Content management" description="Manage banners, hero sections and testimonials shown on the storefront." />
      <Tabs items={TABS} active={tab} onChange={setTab} />
      {tab === "banners" && <BannersTab />}
      {tab === "heroes" && <HeroesTab />}
      {tab === "testimonials" && <TestimonialsTab />}
    </div>
  );
}

function BannersTab() {
  const { banners, upsertBanner, deleteBanner } = useRetail();
  const [editing, setEditing] = useState<Banner | null>(null);
  const empty = (): Banner => ({ id: newId(), title: "", subtitle: "", image: "", ctaLabel: "", ctaLink: "/shop", active: true, order: banners.length + 1 });

  return (
    <>
      <div className="flex justify-end mb-4"><ActionButton onClick={() => setEditing(empty())}><Plus className="h-3.5 w-3.5" /> New banner</ActionButton></div>
      {banners.length === 0 ? <EmptyState title="No banners" /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {banners.map((b) => (
            <div key={b.id} className="border border-border p-4 flex items-start gap-3">
              <div className="w-16 h-20 bg-secondary shrink-0 overflow-hidden">{b.image && <img src={b.image} alt="" className="h-full w-full object-cover" />}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="display text-lg truncate">{b.title || "Untitled banner"}</h4>
                  <StatusPill status={b.active ? "active" : "inactive"} />
                </div>
                <p className="text-sm text-muted-foreground truncate">{b.subtitle}</p>
                <p className="text-xs text-muted-foreground mt-1">Order {b.order} · CTA → {b.ctaLink}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(b)} className="p-2 hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => { if (confirm("Delete banner?")) { deleteBanner(b.id); toast.success("Deleted"); } }} className="p-2 hover:bg-sale hover:text-primary-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <Modal title="Banner" onClose={() => setEditing(null)} wide footer={
          <>
            <ActionButton variant="ghost" onClick={() => setEditing(null)}>Cancel</ActionButton>
            <ActionButton onClick={() => { upsertBanner(editing); toast.success("Saved"); setEditing(null); }}>Save</ActionButton>
          </>
        }>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Title" value={editing.title} onChange={(v) => setEditing({ ...editing, title: v })} />
            <Field label="Subtitle" value={editing.subtitle} onChange={(v) => setEditing({ ...editing, subtitle: v })} />
            <Field label="Image URL" value={editing.image} onChange={(v) => setEditing({ ...editing, image: v })} />
            <Field label="Order" type="number" value={String(editing.order)} onChange={(v) => setEditing({ ...editing, order: Number(v) })} />
            <Field label="CTA label" value={editing.ctaLabel} onChange={(v) => setEditing({ ...editing, ctaLabel: v })} />
            <Field label="CTA link" value={editing.ctaLink} onChange={(v) => setEditing({ ...editing, ctaLink: v })} />
            <label className="flex items-center gap-2 text-xs uppercase tracking-widest col-span-full">
              <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active
            </label>
          </div>
        </Modal>
      )}
    </>
  );
}

function HeroesTab() {
  const { heroes, upsertHero, deleteHero } = useRetail();
  const [editing, setEditing] = useState<Hero | null>(null);
  const empty = (): Hero => ({ id: newId(), eyebrow: "", headline: "", body: "", image: "", active: true });

  return (
    <>
      <div className="flex justify-end mb-4"><ActionButton onClick={() => setEditing(empty())}><Plus className="h-3.5 w-3.5" /> New hero</ActionButton></div>
      {heroes.length === 0 ? <EmptyState title="No hero sections" /> : (
        <div className="space-y-3">
          {heroes.map((h) => (
            <div key={h.id} className="border border-border p-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{h.eyebrow}</div>
                <div className="display text-xl mt-1">{h.headline || "Untitled hero"}</div>
                <p className="text-sm text-muted-foreground mt-1">{h.body}</p>
              </div>
              <div className="flex gap-1">
                <StatusPill status={h.active ? "active" : "inactive"} />
                <button onClick={() => setEditing(h)} className="p-2 hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => { if (confirm("Delete?")) { deleteHero(h.id); toast.success("Deleted"); } }} className="p-2 hover:bg-sale hover:text-primary-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <Modal title="Hero" onClose={() => setEditing(null)} wide footer={
          <>
            <ActionButton variant="ghost" onClick={() => setEditing(null)}>Cancel</ActionButton>
            <ActionButton onClick={() => { upsertHero(editing); toast.success("Saved"); setEditing(null); }}>Save</ActionButton>
          </>
        }>
          <div className="space-y-3">
            <Field label="Eyebrow" value={editing.eyebrow} onChange={(v) => setEditing({ ...editing, eyebrow: v })} />
            <Field label="Headline" value={editing.headline} onChange={(v) => setEditing({ ...editing, headline: v })} />
            <Field label="Body" value={editing.body} onChange={(v) => setEditing({ ...editing, body: v })} textarea />
            <Field label="Image URL" value={editing.image} onChange={(v) => setEditing({ ...editing, image: v })} />
            <label className="flex items-center gap-2 text-xs uppercase tracking-widest">
              <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active
            </label>
          </div>
        </Modal>
      )}
    </>
  );
}

function TestimonialsTab() {
  const { testimonials, upsertTestimonial, deleteTestimonial } = useRetail();
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const empty = (): Testimonial => ({ id: newId(), author: "", role: "", quote: "", rating: 5, active: true });

  return (
    <>
      <div className="flex justify-end mb-4"><ActionButton onClick={() => setEditing(empty())}><Plus className="h-3.5 w-3.5" /> New testimonial</ActionButton></div>
      {testimonials.length === 0 ? <EmptyState title="No testimonials" /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {testimonials.map((t) => (
            <div key={t.id} className="border border-border p-5">
              <div className="flex items-center gap-1 mb-2">
                {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-accent text-accent" />)}
              </div>
              <p className="text-sm mb-3">“{t.quote}”</p>
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <div className="font-semibold">{t.author}</div>
                  <div className="text-muted-foreground">{t.role}</div>
                </div>
                <div className="flex items-center gap-1">
                  <StatusPill status={t.active ? "active" : "inactive"} />
                  <button onClick={() => setEditing(t)} className="p-2 hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { if (confirm("Delete?")) { deleteTestimonial(t.id); toast.success("Deleted"); } }} className="p-2 hover:bg-sale hover:text-primary-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <Modal title="Testimonial" onClose={() => setEditing(null)} footer={
          <>
            <ActionButton variant="ghost" onClick={() => setEditing(null)}>Cancel</ActionButton>
            <ActionButton onClick={() => { upsertTestimonial(editing); toast.success("Saved"); setEditing(null); }}>Save</ActionButton>
          </>
        }>
          <div className="space-y-3">
            <Field label="Author" value={editing.author} onChange={(v) => setEditing({ ...editing, author: v })} />
            <Field label="Role / City" value={editing.role} onChange={(v) => setEditing({ ...editing, role: v })} />
            <Field label="Quote" value={editing.quote} onChange={(v) => setEditing({ ...editing, quote: v })} textarea />
            <Field label="Rating (1-5)" type="number" value={String(editing.rating)} onChange={(v) => setEditing({ ...editing, rating: Math.max(1, Math.min(5, Number(v))) })} />
            <label className="flex items-center gap-2 text-xs uppercase tracking-widest">
              <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active
            </label>
          </div>
        </Modal>
      )}
    </>
  );
}
