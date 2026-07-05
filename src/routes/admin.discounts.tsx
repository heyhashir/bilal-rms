import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRetail, type Discount, newId } from "@/store/retail";
import { useCatalog } from "@/store/catalog";
import { PageHeader, Toolbar, StatusPill, ActionButton, Modal, Field, SelectField, EmptyState } from "@/components/admin/primitives";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/discounts")({
  component: AdminDiscounts,
});

const empty = (): Discount => ({
  id: newId(), name: "", scope: "all", target: "", type: "percent", value: 10,
  startAt: Date.now(), endAt: Date.now() + 30 * 86400000, active: true,
});

function AdminDiscounts() {
  const { discounts, upsertDiscount, deleteDiscount } = useRetail();
  const { products, categories } = useCatalog();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Discount | null>(null);

  const filtered = discounts.filter((d) => d.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader
        eyebrow="Sales"
        title={`Discounts (${discounts.length})`}
        action={<ActionButton onClick={() => setEditing(empty())}><Plus className="h-3.5 w-3.5" /> New discount</ActionButton>}
      />
      <Toolbar search={q} onSearch={setQ} />
      {filtered.length === 0 ? (
        <EmptyState title="No discounts" hint="Create sitewide, category or product-level offers." />
      ) : (
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Scope</th>
                <th className="text-left p-3">Value</th>
                <th className="text-left p-3">Window</th>
                <th className="text-left p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="p-3 font-medium">{d.name}</td>
                  <td className="p-3 capitalize">{d.scope}{d.target && ` · ${d.target}`}</td>
                  <td className="p-3 font-semibold">{d.type === "percent" ? `${d.value}%` : `Rs. ${d.value.toLocaleString()}`}</td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(d.startAt).toLocaleDateString()} → {new Date(d.endAt).toLocaleDateString()}</td>
                  <td className="p-3"><StatusPill status={d.active ? "active" : "inactive"} /></td>
                  <td className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditing(d)} className="p-2 hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => { if (confirm(`Delete "${d.name}"?`)) { deleteDiscount(d.id); toast.success("Deleted"); } }} className="p-2 hover:bg-sale hover:text-primary-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
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
          title={discounts.find((x) => x.id === editing.id) ? "Edit discount" : "New discount"}
          onClose={() => setEditing(null)}
          wide
          footer={
            <>
              <ActionButton variant="ghost" onClick={() => setEditing(null)}>Cancel</ActionButton>
              <ActionButton onClick={() => {
                if (!editing.name) return toast.error("Name required");
                upsertDiscount(editing);
                toast.success("Discount saved");
                setEditing(null);
              }}>Save</ActionButton>
            </>
          }
        >
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
            <SelectField label="Scope" value={editing.scope} onChange={(v) => setEditing({ ...editing, scope: v as Discount["scope"], target: "" })} options={[
              { value: "all", label: "Sitewide" }, { value: "category", label: "Category" }, { value: "product", label: "Product" },
            ]} />
            {editing.scope === "category" && (
              <SelectField label="Category" value={editing.target} onChange={(v) => setEditing({ ...editing, target: v })} options={[{ value: "", label: "Select" }, ...categories.map((c) => ({ value: c.slug, label: c.name }))]} />
            )}
            {editing.scope === "product" && (
              <SelectField label="Product" value={editing.target} onChange={(v) => setEditing({ ...editing, target: v })} options={[{ value: "", label: "Select" }, ...products.map((p) => ({ value: p.id, label: p.name }))]} />
            )}
            <SelectField label="Type" value={editing.type} onChange={(v) => setEditing({ ...editing, type: v as Discount["type"] })} options={[{ value: "percent", label: "Percent" }, { value: "flat", label: "Flat" }]} />
            <Field label="Value" type="number" value={String(editing.value)} onChange={(v) => setEditing({ ...editing, value: Number(v) })} />
            <Field label="Start" type="date" value={new Date(editing.startAt).toISOString().slice(0, 10)} onChange={(v) => setEditing({ ...editing, startAt: new Date(v).getTime() })} />
            <Field label="End" type="date" value={new Date(editing.endAt).toISOString().slice(0, 10)} onChange={(v) => setEditing({ ...editing, endAt: new Date(v).getTime() })} />
            <label className="flex items-center gap-2 text-xs uppercase tracking-widest">
              <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}
