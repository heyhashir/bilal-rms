import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useCatalog } from "@/store/catalog";
import { useSizeCharts } from "@/store/settings";
import type { Product } from "@/data/seed";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

type Draft = Omit<Product, "id" | "createdAt">;

const empty = (): Draft => ({
  slug: "",
  name: "",
  description: "",
  category: "men",
  price: 0,
  salePrice: undefined,
  images: [],
  sizes: [],
  colors: [],
  stock: 0,
  sizeChart: "apparel",
  tags: [],
  seoTitle: "",
  seoDescription: "",
  trending: false,
  featured: false,
});

function AdminProducts() {
  const { products, categories, addProduct, updateProduct, deleteProduct } = useCatalog();
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="display text-2xl">Products ({products.length})</h2>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 text-xs uppercase tracking-widest"
        >
          <Plus className="h-3.5 w-3.5" /> Add product
        </button>
      </div>

      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-secondary text-xs uppercase tracking-widest">
            <tr>
              <th className="text-left p-3">Product</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Price</th>
              <th className="text-left p-3">Stock</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-12 bg-secondary overflow-hidden">
                      <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground truncate">/{p.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3 capitalize">{p.category}</td>
                <td className="p-3">
                  {p.salePrice ? (
                    <span><span className="line-through text-muted-foreground">{formatPrice(p.price)}</span> {formatPrice(p.salePrice)}</span>
                  ) : formatPrice(p.price)}
                </td>
                <td className="p-3">{p.stock === 0 ? <span className="text-sale">Out</span> : p.stock}</td>
                <td className="p-3">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditing(p)} className="p-2 hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /></button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${p.name}"?`)) {
                          deleteProduct(p.id);
                          toast.success("Product deleted");
                        }
                      }}
                      className="p-2 hover:bg-sale hover:text-primary-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(creating || editing) && (
        <ProductDrawer
          initial={editing ?? empty()}
          categories={categories.map((c) => c.slug)}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(d) => {
            if (editing) {
              updateProduct(editing.id, d);
              toast.success("Product updated");
            } else {
              addProduct(d);
              toast.success("Product created");
            }
            setEditing(null); setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function ProductDrawer({
  initial, categories, onClose, onSave,
}: {
  initial: Draft | Product;
  categories: string[];
  onClose: () => void;
  onSave: (d: Draft) => void;
}) {
  const charts = useSizeCharts((s) => s.charts);
  const chartOptions = ["none", ...charts.map((c) => c.key)];
  const [d, setD] = useState<Draft>({ ...initial });
  const [imgUrl, setImgUrl] = useState("");
  const [sizeStr, setSizeStr] = useState(d.sizes.join(", "));
  const [tagStr, setTagStr] = useState(d.tags.join(", "));
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#111111");

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setD((x) => ({ ...x, images: [...x.images, reader.result as string] }));
      reader.readAsDataURL(file);
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const sizes = sizeStr.split(",").map((s) => s.trim()).filter(Boolean);
    const tags = tagStr.split(",").map((s) => s.trim()).filter(Boolean);
    if (!d.name || !d.slug || d.images.length === 0) {
      return toast.error("Name, slug and at least one image are required");
    }
    onSave({ ...d, sizes, tags });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-end md:place-items-center p-0 md:p-6" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-background w-full md:max-w-2xl max-h-[95vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center p-5 border-b border-border sticky top-0 bg-background">
          <h3 className="display text-xl">{("id" in initial) ? "Edit product" : "New product"}</h3>
          <button type="button" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Name" value={d.name} onChange={(v) => setD({ ...d, name: v, slug: d.slug || slugify(v) })} />
            <Field label="Slug" value={d.slug} onChange={(v) => setD({ ...d, slug: slugify(v) })} />
          </div>
          <Field label="Description" value={d.description} onChange={(v) => setD({ ...d, description: v })} textarea />
          <div className="grid md:grid-cols-3 gap-3">
            <Select label="Category" value={d.category} onChange={(v) => setD({ ...d, category: v as Draft["category"] })} options={categories} />
            <Field label="Price (Rs.)" type="number" value={String(d.price)} onChange={(v) => setD({ ...d, price: Number(v) })} />
            <Field label="Sale price (Rs.)" type="number" value={String(d.salePrice ?? "")} onChange={(v) => setD({ ...d, salePrice: v ? Number(v) : undefined })} />
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <Field label="Stock" type="number" value={String(d.stock)} onChange={(v) => setD({ ...d, stock: Number(v) })} />
            <Select label="Size chart" value={d.sizeChart} onChange={(v) => setD({ ...d, sizeChart: v as Draft["sizeChart"] })} options={chartOptions} />
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-xs uppercase tracking-widest">
                <input type="checkbox" checked={!!d.trending} onChange={(e) => setD({ ...d, trending: e.target.checked })} /> Trending
              </label>
              <label className="flex items-center gap-2 text-xs uppercase tracking-widest">
                <input type="checkbox" checked={!!d.featured} onChange={(e) => setD({ ...d, featured: e.target.checked })} /> Featured
              </label>
            </div>
          </div>

          <Field label="Sizes (comma separated)" value={sizeStr} onChange={setSizeStr} />
          <Field label="Tags (e.g. #basics, #tee)" value={tagStr} onChange={setTagStr} />
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="SEO title" value={d.seoTitle ?? ""} onChange={(v) => setD({ ...d, seoTitle: v })} />
            <Field label="SEO description" value={d.seoDescription ?? ""} onChange={(v) => setD({ ...d, seoDescription: v })} />
          </div>

          {/* Colors */}
          <div>
            <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Colors</span>
            <div className="flex flex-wrap gap-2 mb-2">
              {d.colors.map((c, i) => (
                <span key={i} className="inline-flex items-center gap-2 border border-border px-2 py-1 text-xs">
                  <span className="h-3 w-3 rounded-full" style={{ background: c.hex }} />
                  {c.name}
                  <button type="button" onClick={() => setD({ ...d, colors: d.colors.filter((_, j) => j !== i) })}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={colorName} onChange={(e) => setColorName(e.target.value)} placeholder="Color name" className="flex-1 border border-border px-3 py-2 text-sm bg-background" />
              <input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} className="h-10 w-12 border border-border bg-background" />
              <button
                type="button"
                onClick={() => {
                  if (!colorName) return;
                  setD({ ...d, colors: [...d.colors, { name: colorName, hex: colorHex }] });
                  setColorName("");
                }}
                className="bg-secondary px-4 text-xs uppercase tracking-widest"
              >Add</button>
            </div>
          </div>

          {/* Images */}
          <div>
            <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Images</span>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {d.images.map((src, i) => (
                <div key={i} className="relative aspect-[4/5] bg-secondary overflow-hidden">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setD({ ...d, images: d.images.filter((_, j) => j !== i) })}
                    className="absolute top-1 right-1 bg-background/90 p-1"
                  ><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} placeholder="Image URL" className="flex-1 border border-border px-3 py-2 text-sm bg-background" />
              <button
                type="button"
                onClick={() => { if (imgUrl) { setD({ ...d, images: [...d.images, imgUrl] }); setImgUrl(""); } }}
                className="bg-secondary px-4 text-xs uppercase tracking-widest"
              >Add URL</button>
              <label className="bg-secondary px-4 text-xs uppercase tracking-widest grid place-items-center cursor-pointer">
                Upload
                <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => onFiles(e.target.files)} />
              </label>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-border sticky bottom-0 bg-background flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-5 py-3 text-xs uppercase tracking-widest border border-border">Cancel</button>
          <button className="bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-widest">Save</button>
        </div>
      </form>
    </div>
  );
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function Field({ label, value, onChange, type = "text", textarea }: { label: string; value: string; onChange: (v: string) => void; type?: string; textarea?: boolean }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
      )}
    </label>
  );
}
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm">
        {options.map((o) => <option key={o} value={o} className="capitalize">{o}</option>)}
      </select>
    </label>
  );
}
