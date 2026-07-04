import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRetail, type Brand, newId } from "@/store/retail";
import { PageHeader, Toolbar, StatusPill, ActionButton, Modal, Field, SelectField, EmptyState } from "@/components/admin/primitives";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/brands")({
  component: AdminBrands,
});

const empty = (): Brand => ({ id: newId(), name: "", slug: "", country: "Pakistan", website: "", status: "active", createdAt: Date.now() });

function AdminBrands() {
  const { brands, upsertBrand, deleteBrand } = useRetail();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Brand | null>(null);

  const filtered = brands.filter((b) => `${b.name} ${b.country}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader
        eyebrow="Catalog"
        title={`Brands (${brands.length})`}
        action={<ActionButton onClick={() => setEditing(empty())}><Plus className="h-3.5 w-3.5" /> New brand</ActionButton>}
      />
      <Toolbar search={q} onSearch={setQ} />
      {filtered.length === 0 ? (
        <EmptyState title="No brands" hint="Add your first brand to get started." />
      ) : (
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="text-left p-3">Brand</th>
                <th className="text-left p-3">Country</th>
                <th className="text-left p-3">Website</th>
                <th className="text-left p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="p-3 font-medium">{b.name}<div className="text-xs text-muted-foreground">/{b.slug}</div></td>
                  <td className="p-3">{b.country}</td>
                  <td className="p-3 text-muted-foreground truncate max-w-[220px]">{b.website}</td>
                  <td className="p-3"><StatusPill status={b.status} /></td>
                  <td className="p-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditing(b)} className="p-2 hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => { if (confirm(`Delete brand "${b.name}"?`)) { deleteBrand(b.id); toast.success("Deleted"); } }} className="p-2 hover:bg-sale hover:text-primary-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
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
          title={brands.find((b) => b.id === editing.id) ? "Edit brand" : "New brand"}
          onClose={() => setEditing(null)}
          footer={
            <>
              <ActionButton variant="ghost" onClick={() => setEditing(null)}>Cancel</ActionButton>
              <ActionButton onClick={() => {
                if (!editing.name) return toast.error("Name is required");
                const slug = editing.slug || editing.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
                upsertBrand({ ...editing, slug });
                toast.success("Brand saved");
                setEditing(null);
              }}>Save</ActionButton>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
              <Field label="Slug" value={editing.slug} onChange={(v) => setEditing({ ...editing, slug: v })} placeholder="auto-generated" />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
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
