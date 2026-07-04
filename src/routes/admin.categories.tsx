import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useCatalog } from "@/store/catalog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategories,
});

function AdminCategories() {
  const { categories, products, upsertCategory, deleteCategory } = useCatalog();
  const [name, setName] = useState("");

  const add = () => {
    if (!name) return;
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    upsertCategory({ slug, name });
    setName("");
    toast.success("Category added");
  };

  return (
    <div>
      <h2 className="display text-2xl mb-5">Categories</h2>
      <div className="flex gap-2 mb-6 max-w-md">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" className="flex-1 border border-border bg-background px-3 py-2.5 text-sm" />
        <button onClick={add} className="bg-primary text-primary-foreground px-4 text-xs uppercase tracking-widest inline-flex items-center gap-1">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
      <div className="border border-border">
        {categories.map((c) => {
          const count = products.filter((p) => p.category === c.slug).length;
          return (
            <div key={c.slug} className="flex items-center gap-3 p-4 border-b border-border last:border-0">
              <div className="flex-1">
                <div className="font-medium capitalize">{c.name}</div>
                <div className="text-xs text-muted-foreground">/{c.slug} · {count} products</div>
              </div>
              <button
                onClick={() => {
                  if (count > 0) return toast.error("Move products first");
                  if (confirm(`Delete category "${c.name}"?`)) {
                    deleteCategory(c.slug);
                    toast.success("Deleted");
                  }
                }}
                className="p-2 hover:bg-sale hover:text-primary-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
