import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRetail, type Coupon, newId } from "@/store/retail";
import { PageHeader, Toolbar, StatusPill, ActionButton, Modal, Field, SelectField, EmptyState } from "@/components/admin/primitives";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/coupons")({
  component: AdminCoupons,
});

const empty = (): Coupon => ({
  id: newId(), code: "", type: "percent", value: 10, minOrder: 0, usageLimit: 100, used: 0, expiresAt: Date.now() + 30 * 86400000, active: true,
});

function AdminCoupons() {
  const { coupons, upsertCoupon, deleteCoupon } = useRetail();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Coupon | null>(null);

  const filtered = coupons.filter((c) => c.code.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader
        eyebrow="Sales"
        title={`Coupons (${coupons.length})`}
        action={<ActionButton onClick={() => setEditing(empty())}><Plus className="h-3.5 w-3.5" /> New coupon</ActionButton>}
      />
      <Toolbar search={q} onSearch={setQ} />
      {filtered.length === 0 ? (
        <EmptyState title="No coupons" hint="Create promo codes to drive campaigns." />
      ) : (
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="text-left p-3">Code</th>
                <th className="text-left p-3">Value</th>
                <th className="text-left p-3">Min order</th>
                <th className="text-left p-3">Usage</th>
                <th className="text-left p-3">Expires</th>
                <th className="text-left p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-3 font-mono font-semibold">{c.code}</td>
                  <td className="p-3">{c.type === "percent" ? `${c.value}%` : `Rs. ${c.value.toLocaleString()}`}</td>
                  <td className="p-3">Rs. {c.minOrder.toLocaleString()}</td>
                  <td className="p-3">{c.used}/{c.usageLimit}</td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(c.expiresAt).toLocaleDateString()}</td>
                  <td className="p-3"><StatusPill status={c.active ? "active" : "inactive"} /></td>
                  <td className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditing(c)} className="p-2 hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => { if (confirm(`Delete ${c.code}?`)) { deleteCoupon(c.id); toast.success("Deleted"); } }} className="p-2 hover:bg-sale hover:text-primary-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
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
          title={coupons.find((x) => x.id === editing.id) ? "Edit coupon" : "New coupon"}
          onClose={() => setEditing(null)}
          footer={
            <>
              <ActionButton variant="ghost" onClick={() => setEditing(null)}>Cancel</ActionButton>
              <ActionButton onClick={() => {
                if (!editing.code) return toast.error("Code required");
                upsertCoupon({ ...editing, code: editing.code.toUpperCase() });
                toast.success("Coupon saved");
                setEditing(null);
              }}>Save</ActionButton>
            </>
          }
        >
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Code" value={editing.code} onChange={(v) => setEditing({ ...editing, code: v.toUpperCase() })} />
            <SelectField label="Type" value={editing.type} onChange={(v) => setEditing({ ...editing, type: v as Coupon["type"] })} options={[{ value: "percent", label: "Percent" }, { value: "flat", label: "Flat" }]} />
            <Field label="Value" type="number" value={String(editing.value)} onChange={(v) => setEditing({ ...editing, value: Number(v) })} />
            <Field label="Min order" type="number" value={String(editing.minOrder)} onChange={(v) => setEditing({ ...editing, minOrder: Number(v) })} />
            <Field label="Usage limit" type="number" value={String(editing.usageLimit)} onChange={(v) => setEditing({ ...editing, usageLimit: Number(v) })} />
            <Field label="Expires" type="date" value={new Date(editing.expiresAt).toISOString().slice(0, 10)} onChange={(v) => setEditing({ ...editing, expiresAt: new Date(v).getTime() })} />
            <label className="flex items-center gap-2 text-xs uppercase tracking-widest col-span-full">
              <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}
