import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Eye } from "lucide-react";
import { useRetail, type PurchaseOrder, type POLine, newId } from "@/store/retail";
import { useCatalog } from "@/store/catalog";
import { PageHeader, Toolbar, StatusPill, ActionButton, Modal, Field, SelectField, EmptyState } from "@/components/admin/primitives";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/purchase-orders")({
  component: AdminPO,
});

const empty = (supplierId = "", supplierName = ""): PurchaseOrder => ({
  id: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
  supplierId,
  supplierName,
  status: "draft",
  lines: [],
  total: 0,
  expectedAt: Date.now() + 7 * 86400000,
  createdAt: Date.now(),
  notes: "",
});

function AdminPO() {
  const { purchaseOrders, upsertPO, deletePO, setPOStatus, suppliers, logMovement } = useRetail();
  const products = useCatalog((s) => s.products);
  const updateProduct = useCatalog((s) => s.updateProduct);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [view, setView] = useState<PurchaseOrder | null>(null);

  const filtered = purchaseOrders.filter((p) =>
    (status === "all" || p.status === status) &&
    `${p.id} ${p.supplierName}`.toLowerCase().includes(q.toLowerCase())
  );

  const openNew = () => {
    const s = suppliers[0];
    if (!s) return toast.error("Add a supplier first");
    setEditing(empty(s.id, s.name));
  };

  const receive = (po: PurchaseOrder) => {
    po.lines.forEach((l) => {
      const p = products.find((x) => x.id === l.productId);
      if (p) updateProduct(p.id, { stock: p.stock + l.qty });
      logMovement({ productId: l.productId, productName: l.productName, qty: l.qty, reason: "purchase", reference: po.id, note: "Received", createdBy: "Bilal (Admin)" });
    });
    setPOStatus(po.id, "received");
    toast.success(`${po.id} received into stock`);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Inventory"
        title={`Purchase orders (${purchaseOrders.length})`}
        action={<ActionButton onClick={openNew}><Plus className="h-3.5 w-3.5" /> New PO</ActionButton>}
      />
      <Toolbar
        search={q}
        onSearch={setQ}
        right={
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-border bg-background px-3 py-2 text-xs uppercase tracking-widest">
            {["all", "draft", "ordered", "received", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState title="No purchase orders" hint="Create one to replenish stock." />
      ) : (
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="text-left p-3">PO #</th>
                <th className="text-left p-3">Supplier</th>
                <th className="text-left p-3">Items</th>
                <th className="text-left p-3">Total</th>
                <th className="text-left p-3">Expected</th>
                <th className="text-left p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3 font-semibold">{p.id}</td>
                  <td className="p-3">{p.supplierName}</td>
                  <td className="p-3">{p.lines.reduce((a, l) => a + l.qty, 0)} units</td>
                  <td className="p-3 font-semibold">{formatPrice(p.total)}</td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(p.expectedAt).toLocaleDateString()}</td>
                  <td className="p-3"><StatusPill status={p.status} /></td>
                  <td className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setView(p)} className="p-2 hover:bg-secondary"><Eye className="h-3.5 w-3.5" /></button>
                      {p.status === "ordered" && (
                        <button onClick={() => receive(p)} className="text-xs uppercase tracking-widest underline px-2">Receive</button>
                      )}
                      <button onClick={() => { if (confirm(`Delete ${p.id}?`)) { deletePO(p.id); toast.success("Deleted"); } }} className="p-2 hover:bg-sale hover:text-primary-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view && (
        <Modal title={view.id} onClose={() => setView(null)} wide>
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <div><span className="text-muted-foreground uppercase text-xs tracking-widest">Supplier</span><div>{view.supplierName}</div></div>
              <StatusPill status={view.status} />
            </div>
            <div className="border-y border-border py-2">
              {view.lines.map((l, i) => (
                <div key={i} className="flex justify-between py-1.5">
                  <span>{l.productName} · {l.qty} × {formatPrice(l.unitCost)}</span>
                  <span className="font-semibold">{formatPrice(l.qty * l.unitCost)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>{formatPrice(view.total)}</span></div>
            {view.notes && <p className="text-muted-foreground">{view.notes}</p>}
          </div>
        </Modal>
      )}

      {editing && (
        <POEditor
          po={editing}
          onClose={() => setEditing(null)}
          onSave={(p) => { upsertPO(p); toast.success("Purchase order saved"); setEditing(null); }}
        />
      )}
    </div>
  );
}

function POEditor({ po, onClose, onSave }: { po: PurchaseOrder; onClose: () => void; onSave: (p: PurchaseOrder) => void }) {
  const products = useCatalog((s) => s.products);
  const suppliers = useRetail((s) => s.suppliers);
  const [d, setD] = useState<PurchaseOrder>(po);
  const [pick, setPick] = useState(products[0]?.id ?? "");
  const [qty, setQty] = useState(10);
  const [cost, setCost] = useState(1000);

  const addLine = () => {
    const p = products.find((x) => x.id === pick);
    if (!p) return;
    const line: POLine = { productId: p.id, productName: p.name, qty, unitCost: cost };
    const lines = [...d.lines, line];
    setD({ ...d, lines, total: lines.reduce((a, l) => a + l.qty * l.unitCost, 0) });
  };
  const rm = (i: number) => {
    const lines = d.lines.filter((_, x) => x !== i);
    setD({ ...d, lines, total: lines.reduce((a, l) => a + l.qty * l.unitCost, 0) });
  };

  return (
    <Modal
      title={po.id}
      onClose={onClose}
      wide
      footer={
        <>
          <ActionButton variant="ghost" onClick={onClose}>Cancel</ActionButton>
          <ActionButton onClick={() => onSave(d)}>Save</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <SelectField
            label="Supplier"
            value={d.supplierId}
            onChange={(v) => {
              const s = suppliers.find((x) => x.id === v);
              setD({ ...d, supplierId: v, supplierName: s?.name ?? "" });
            }}
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
          />
          <SelectField
            label="Status"
            value={d.status}
            onChange={(v) => setD({ ...d, status: v as PurchaseOrder["status"] })}
            options={[
              { value: "draft", label: "Draft" },
              { value: "ordered", label: "Ordered" },
              { value: "received", label: "Received" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
          <Field
            label="Expected date"
            type="date"
            value={new Date(d.expectedAt).toISOString().slice(0, 10)}
            onChange={(v) => setD({ ...d, expectedAt: new Date(v).getTime() })}
          />
        </div>

        <div>
          <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Line items</span>
          <div className="border border-border">
            {d.lines.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">No line items yet.</div>
            ) : d.lines.map((l, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border-b border-border last:border-0 text-sm">
                <span className="flex-1">{l.productName}</span>
                <span>{l.qty} × {formatPrice(l.unitCost)}</span>
                <span className="font-semibold w-24 text-right">{formatPrice(l.qty * l.unitCost)}</span>
                <button onClick={() => rm(i)} className="p-1 hover:bg-sale hover:text-primary-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-4 gap-2 mt-3">
            <SelectField label="Product" value={pick} onChange={setPick} options={products.map((p) => ({ value: p.id, label: p.name }))} />
            <Field label="Qty" type="number" value={String(qty)} onChange={(v) => setQty(Number(v))} />
            <Field label="Unit cost" type="number" value={String(cost)} onChange={(v) => setCost(Number(v))} />
            <div className="flex items-end"><ActionButton variant="ghost" onClick={addLine}><Plus className="h-3.5 w-3.5" /> Add line</ActionButton></div>
          </div>
        </div>

        <Field label="Notes" value={d.notes} onChange={(v) => setD({ ...d, notes: v })} textarea />
        <div className="text-right font-semibold">Total {formatPrice(d.total)}</div>
      </div>
    </Modal>
  );
}
void newId;
