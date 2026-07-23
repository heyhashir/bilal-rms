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
  const [parentId, setParentId] = useState("");
  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.admin.categories,
    queryFn: async () => (await adminCatalogApi.categories()).categories,
  });
  const { data: products = [] } = useQuery({
    queryKey: queryKeys.admin.products,
    queryFn: async () => (await adminCatalogApi.products()).products,
  });
  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);
  const counts = useMemo(
    () => buildCategoryCounts(flatCategories, products),
    [flatCategories, products],
  );

  const saveCategory = useMutation({
    mutationFn: adminCatalogApi.saveCategory,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories });
      setName("");
      setParentId("");
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
      toast.success("Category archived");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to archive category"));
    },
  });

  const add = async () => {
    if (!name.trim()) return;
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    saveCategory.mutate({ slug, name: name.trim(), parentId: parentId || null, isActive: true });
  };

  return (
    <div>
      <h2 className="display mb-5 text-2xl">Categories</h2>
      <div className="mb-6 grid max-w-2xl gap-2 md:grid-cols-[1fr_220px_auto]">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New category or subcategory"
          className="border border-border bg-background px-3 py-2.5 text-sm"
        />
        <select
          value={parentId}
          onChange={(event) => setParentId(event.target.value)}
          className="border border-border bg-background px-3 py-2.5 text-sm"
        >
          <option value="">Top level</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => void add()}
          className="inline-flex items-center gap-1 bg-primary px-4 text-xs uppercase tracking-widest text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
      <div className="border border-border">
        {categories.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            counts={counts}
            onArchive={(slug, nameToDelete, count) => {
              if (count > 0) {
                toast.error("Move products first");
                return;
              }

              if (confirm(`Archive category "${nameToDelete}"?`)) {
                deleteCategory.mutate(slug);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryRow({
  category,
  counts,
  onArchive,
  depth = 0,
}: {
  category: Category;
  counts: Map<string, number>;
  onArchive: (slug: string, name: string, count: number) => void;
  depth?: number;
}) {
  const count = counts.get(category.slug) ?? 0;

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border p-4 last:border-0">
        <div className="flex-1" style={{ paddingLeft: depth * 20 }}>
          <div className="font-medium capitalize">{category.name}</div>
          <div className="text-xs text-muted-foreground">
            /{category.slug} · {count} products
          </div>
        </div>
        <button
          onClick={() => onArchive(category.slug, category.name, count)}
          className="p-2 hover:bg-sale hover:text-primary-foreground"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {category.children.map((child) => (
        <CategoryRow key={child.id} category={child} counts={counts} onArchive={onArchive} depth={depth + 1} />
      ))}
    </>
  );
}

function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap((category) => [category, ...flattenCategories(category.children)]);
}

function buildCategoryCounts(categories: Category[], products: Product[]) {
  const counts = new Map<string, number>();

  for (const category of categories) {
    counts.set(category.slug, products.filter((product) => product.category === category.slug).length);
  }

  return counts;
}
