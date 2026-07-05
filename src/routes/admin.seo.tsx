import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useCatalog } from "@/store/catalog";
import { useSettings } from "@/store/settings";
import { Search, Tag, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/seo")({
  component: AdminSeo,
});

function AdminSeo() {
  const { products, updateProduct } = useCatalog();
  const { settings, update } = useSettings();
  const [q, setQ] = useState("");
  const [globalTag, setGlobalTag] = useState("");

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.slug.includes(q.toLowerCase())),
    [products, q],
  );

  const allTags = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => p.tags.forEach((t) => map.set(t, (map.get(t) ?? 0) + 1)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [products]);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="display text-2xl mb-4">Global SEO</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Site meta title" value={settings.metaTitle} onChange={(v) => update({ metaTitle: v })} />
          <Field label="Site meta description" value={settings.metaDescription} onChange={(v) => update({ metaDescription: v })} />
        </div>
        <div className="mt-4">
          <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Global hashtags</span>
          <div className="flex flex-wrap gap-2 mb-2">
            {settings.globalHashtags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 border border-border px-2 py-1 text-xs">
                {t}
                <button onClick={() => update({ globalHashtags: settings.globalHashtags.filter((x) => x !== t) })}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 max-w-md">
            <input value={globalTag} onChange={(e) => setGlobalTag(e.target.value)} placeholder="#newtag" className="flex-1 border border-border bg-background px-3 py-2 text-sm" />
            <button
              onClick={() => {
                const t = globalTag.startsWith("#") ? globalTag : `#${globalTag}`;
                if (!globalTag || settings.globalHashtags.includes(t)) return;
                update({ globalHashtags: [...settings.globalHashtags, t] });
                setGlobalTag("");
              }}
              className="bg-primary text-primary-foreground px-4 text-xs uppercase tracking-widest"
            >Add</button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="display text-2xl mb-4">Tag library</h2>
        {allTags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tags yet — add them to products below.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allTags.map(([t, n]) => (
              <span key={t} className="inline-flex items-center gap-2 bg-secondary px-3 py-1.5 text-xs">
                <Tag className="h-3 w-3" /> {t} <span className="text-muted-foreground">×{n}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="display text-2xl">Per-product SEO</h2>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="border border-border bg-background pl-8 pr-3 py-2 text-sm" />
          </div>
        </div>
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="border border-border p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-12 bg-secondary overflow-hidden">
                  <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground truncate">/{p.slug}</div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="SEO title" value={p.seoTitle ?? ""} onChange={(v) => updateProduct(p.id, { seoTitle: v })} />
                <Field label="SEO description" value={p.seoDescription ?? ""} onChange={(v) => updateProduct(p.id, { seoDescription: v })} />
              </div>
              <div className="mt-3">
                <TagsEditor
                  value={p.tags}
                  onChange={(tags) => updateProduct(p.id, { tags })}
                />
              </div>
              <button
                onClick={() => toast.success("Saved")}
                className="mt-3 text-xs uppercase tracking-widest underline text-muted-foreground"
              >Saved automatically</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TagsEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [t, setT] = useState("");
  return (
    <div>
      <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Hashtags</span>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 border border-border px-2 py-1 text-xs">
            {tag}
            <button onClick={() => onChange(value.filter((x) => x !== tag))}><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2 max-w-md">
        <input value={t} onChange={(e) => setT(e.target.value)} placeholder="#tag" className="flex-1 border border-border bg-background px-3 py-2 text-sm" />
        <button
          onClick={() => {
            const tag = t.startsWith("#") ? t : `#${t}`;
            if (!t || value.includes(tag)) return;
            onChange([...value, tag]);
            setT("");
          }}
          className="bg-secondary px-4 text-xs uppercase tracking-widest"
        >Add</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
    </label>
  );
}
