import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { adminCatalogApi } from "@/lib/admin-catalog-api";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import type { Brand } from "@/lib/catalog-types";
import { ActionButton, EmptyState, Field, Modal, PageHeader, SelectField, StatusPill, Toolbar } from "@/components/admin/primitives";

export const Route = createFileRoute("/admin/brands")({
  component: AdminBrands,
});

const empty = (): Brand => ({ id: "", name: "", slug: "", country: "Pakistan", website: "", status: "active", createdAt: Date.now() });

function AdminBrands() {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Brand | null>(null);
  const { data: brands = [] } = useQuery({
    queryKey: queryKeys.admin.brands,
    queryFn: async () => (await adminCatalogApi.brands()).brands,
  });
  const saveBrand = useMutation({
    mutationFn: adminCatalogApi.saveBrand,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.brands });
      toast.success("Brand saved");
      setEditing(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to save brand"));
    },
  });
  const archiveBrand = useMutation({
    mutationFn: adminCatalogApi.deleteBrand,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.brands });
      toast.success("Brand archived");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to archive brand"));
    },
  });

  const filtered = brands.filter((brand) => `${brand.name} ${brand.country}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <PageHeader
        eyebrow="Catalog"
        title={`Brands (${brands.length})`}
        action={<ActionButton onClick={() => setEditing(empty())}><Plus className="h-3.5 w-3.5" /> New brand</ActionButton>}
      />
      <Toolbar search={query} onSearch={setQuery} />
      {filtered.length === 0 ? (
        <EmptyState title="No brands" hint="Add your first brand to get started." />
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="min-w-[600px] w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="p-3 text-left">Brand</th>
                <th className="p-3 text-left">Country</th>
                <th className="p-3 text-left">Website</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((brand) => (
                <tr key={brand.slug} className="border-t border-border">
                  <td className="p-3 font-medium">{brand.name}<div className="text-xs text-muted-foreground">/{brand.slug}</div></td>
                  <td className="p-3">{brand.country}</td>
                  <td className="max-w-[220px] truncate p-3 text-muted-foreground">{brand.website}</td>
                  <td className="p-3"><StatusPill status={brand.status} /></td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditing(brand)} className="p-2 hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /></button>
                      <button
                        onClick={async () => {
                          if (confirm(`Archive brand "${brand.name}"?`)) {
                            archiveBrand.mutate(brand.slug);
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
      )}

      {editing && (
        <Modal
          title={editing.id ? "Edit brand" : "New brand"}
          onClose={() => setEditing(null)}
          footer={
            <>
              <ActionButton variant="ghost" onClick={() => setEditing(null)}>Cancel</ActionButton>
              <ActionButton onClick={async () => {
                if (!editing.name) return toast.error("Name is required");
                const slug = editing.slug || editing.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
                saveBrand.mutate({ ...editing, slug });
              }}>Save</ActionButton>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
              <Field label="Slug" value={editing.slug} onChange={(v) => setEditing({ ...editing, slug: v })} placeholder="auto-generated" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Country" value={editing.country} onChange={(v) => setEditing({ ...editing, country: v })} />
              <Field label="Website" value={editing.website} onChange={(v) => setEditing({ ...editing, website: v })} />
            </div>
            <SelectField
              label="Status"
              value={editing.status}
              onChange={(v) => setEditing({ ...editing, status: v as Brand["status"] })}
              options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
