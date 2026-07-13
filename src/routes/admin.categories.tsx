import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { adminCatalogApi } from "@/lib/admin-catalog-api";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import type { Category, Product } from "@/lib/catalog-types";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategories,
});

function AdminCategories() {
  const [name, setName] = useState("");
  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.admin.categories,
    queryFn: async () => (await adminCatalogApi.categories()).categories,
  });
  const { data: products = [] } = useQuery({
    queryKey: queryKeys.admin.products,
    queryFn: async () => (await adminCatalogApi.products()).products,
  });
  const saveCategory = useMutation({
    mutationFn: adminCatalogApi.saveCategory,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories });
      setName("");
      toast.success("Category saved");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to save category"));
    },
  });
  const deleteCategory = useMutation({
    mutationFn: adminCatalogApi.deleteCategory,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories });
      toast.success("Deleted");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to delete category"));
    },
  });

  const counts = useMemo(
    () => new Map(categories.map((category) => [category.slug, products.filter((product) => product.category === category.slug).length])),
    [categories, products],
  );

  const add = async () => {
    if (!name) return;
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    saveCategory.mutate({ slug, name });
  };

  return (
    <div>
      <h2 className="display mb-5 text-2xl">Categories</h2>
      <div className="mb-6 flex max-w-md gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" className="flex-1 border border-border bg-background px-3 py-2.5 text-sm" />
        <button onClick={() => void add()} className="inline-flex items-center gap-1 bg-primary px-4 text-xs uppercase tracking-widest text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
      <div className="border border-border">
        {categories.map((category) => {
          const count = counts.get(category.slug) ?? 0;
          return (
            <div key={category.slug} className="flex items-center gap-3 border-b border-border p-4 last:border-0">
              <div className="flex-1">
                <div className="font-medium capitalize">{category.name}</div>
                <div className="text-xs text-muted-foreground">/{category.slug} · {count} products</div>
              </div>
              <button
                onClick={async () => {
                  if (count > 0) return toast.error("Move products first");
                  if (confirm(`Delete category "${category.name}"?`)) {
                    deleteCategory.mutate(category.slug);
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
