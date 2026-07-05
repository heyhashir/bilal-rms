import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRetail, type Supplier, newId } from "@/store/retail";
import { PageHeader, Toolbar, StatusPill, ActionButton, Modal, Field, SelectField, EmptyState } from "@/components/admin/primitives";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/suppliers")({
  component: AdminSuppliers,
});

const empty = (): Supplier => ({
  id: newId(), name: "", contact: "", email: "", phone: "", city: "", paymentTerms: "Net 30", status: "active", createdAt: Date.now(),
});

function AdminSuppliers() {
  const { suppliers, upsertSupplier, deleteSupplier } = useRetail();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Supplier | null>(null);

  const filtered = suppliers.filter((s) => `${s.name} ${s.contact} ${s.city}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader
        eyebrow="Inventory"
        title={`Suppliers (${suppliers.length})`}
        action={<ActionButton onClick={() => setEditing(empty())}><Plus className="h-3.5 w-3.5" /> New supplier</ActionButton>}
      />
      <Toolbar search={q} onSearch={setQ} />
      {filtered.length === 0 ? (
        <EmptyState title="No suppliers" hint="Add manufacturers, importers or distributors." />
      ) : (
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="text-left p-3">Supplier</th>
                <th className="text-left p-3">Contact</th>
                <th className="text-left p-3">City</th>
                <th className="text-left p-3">Terms</th>
                <th className="text-left p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-3 font-medium">{s.name}<div className="text-xs text-muted-foreground">{s.email}</div></td>
                  <td className="p-3">{s.contact}<div className="text-xs text-muted-foreground">{s.phone}</div></td>
                  <td className="p-3">{s.city}</td>
                  <td className="p-3">{s.paymentTerms}</td>
                  <td className="p-3"><StatusPill status={s.status} /></td>
                  <td className="p-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditing(s)} className="p-2 hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => { if (confirm(`Delete "${s.name}"?`)) { deleteSupplier(s.id); toast.success("Deleted"); } }} className="p-2 hover:bg-sale hover:text-primary-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
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
          title={suppliers.find((x) => x.id === editing.id) ? "Edit supplier" : "New supplier"}
          onClose={() => setEditing(null)}
          wide
          footer={
            <>
              <ActionButton variant="ghost" onClick={() => setEditing(null)}>Cancel</ActionButton>
              <ActionButton onClick={() => {
                if (!editing.name) return toast.error("Name is required");
                upsertSupplier(editing);
                toast.success("Supplier saved");
                setEditing(null);
              }}>Save</ActionButton>
            </>
          }
        >
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Supplier name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
            <Field label="Contact person" value={editing.contact} onChange={(v) => setEditing({ ...editing, contact: v })} />
            <Field label="Email" type="email" value={editing.email} onChange={(v) => setEditing({ ...editing, email: v })} />
            <Field label="Phone" value={editing.phone} onChange={(v) => setEditing({ ...editing, phone: v })} />
            <Field label="City" value={editing.city} onChange={(v) => setEditing({ ...editing, city: v })} />
            <Field label="Payment terms" value={editing.paymentTerms} onChange={(v) => setEditing({ ...editing, paymentTerms: v })} />
            <SelectField
              label="Status"
              value={editing.status}
              onChange={(v) => setEditing({ ...editing, status: v as Supplier["status"] })}
              options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
