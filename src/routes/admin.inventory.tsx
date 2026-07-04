import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useCatalog } from "@/store/catalog";
import { useRetail, type Movement, type MovementReason, newId } from "@/store/retail";
import { PageHeader, Tabs, Toolbar, StatCard, ActionButton, Modal, Field, SelectField, EmptyState, StatusPill } from "@/components/admin/primitives";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/admin/inventory")({
  component: AdminInventory,
});

const TABS = [
  { key: "current", label: "Current stock" },
  { key: "adjustments", label: "Stock adjustments" },
  { key: "history", label: "Inventory history" },
  { key: "low", label: "Low stock" },
  { key: "damaged", label: "Damaged" },
  { key: "returned", label: "Returned items" },
  { key: "transfers", label: "Stock transfers" },
  { key: "timeline", label: "Timeline" },
];

function AdminInventory() {
  const products = useCatalog((s) => s.products);
  const updateProduct = useCatalog((s) => s.updateProduct);
  const { movements, logMovement } = useRetail();
  const [tab, setTab] = useState("current");
  const [q, setQ] = useState("");
  const [adjust, setAdjust] = useState<{ productId: string; qty: number; note: string; reason: MovementReason } | null>(null);

  const inStock = products.reduce((a, p) => a + p.stock, 0);
  const lowCount = products.filter((p) => p.stock > 0 && p.stock <= 5).length;
  const outCount = products.filter((p) => p.stock === 0).length;

  return (
    <div>
      <PageHeader
        eyebrow="Inventory"
        title="Stock & movements."
        description="Every quantity change is tracked and auditable."
        action={<ActionButton onClick={() => setAdjust({ productId: products[0]?.id ?? "", qty: 0, note: "", reason: "adjustment" })}><Plus className="h-3.5 w-3.5" /> Adjust stock</ActionButton>}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Units in stock" value={inStock} />
        <StatCard label="SKUs tracked" value={products.length} />
        <StatCard label="Low stock" value={lowCount} tone={lowCount > 0 ? "down" : "flat"} />
        <StatCard label="Out of stock" value={outCount} tone={outCount > 0 ? "down" : "flat"} />
      </div>

      <Tabs items={TABS} active={tab} onChange={setTab} />

      {(tab === "current" || tab === "low") && (
        <>
          <Toolbar search={q} onSearch={setQ} />
          <StockTable
            rows={products.filter((p) => (tab === "low" ? p.stock <= 5 : true) && p.name.toLowerCase().includes(q.toLowerCase()))}
            onAdjust={(id) => setAdjust({ productId: id, qty: 0, note: "", reason: "adjustment" })}
          />
        </>
      )}

      {tab === "adjustments" && (
        <MovementTable rows={movements.filter((m) => m.reason === "adjustment")} />
      )}
      {tab === "history" && (
        <MovementTable rows={movements} />
      )}
      {tab === "damaged" && (
        <MovementTable rows={movements.filter((m) => m.reason === "damage")} />
      )}
      {tab === "returned" && (
        <MovementTable rows={movements.filter((m) => m.reason === "return")} />
      )}
      {tab === "transfers" && (
        <EmptyState title="Stock transfers" hint="Multi-store transfers will unlock when additional locations are added." />
      )}
      {tab === "timeline" && <Timeline movements={movements} />}

      {adjust && (
        <Modal
          title="Stock adjustment"
          onClose={() => setAdjust(null)}
          footer={
            <>
              <ActionButton variant="ghost" onClick={() => setAdjust(null)}>Cancel</ActionButton>
              <ActionButton onClick={() => {
                const p = products.find((x) => x.id === adjust.productId);
                if (!p) return toast.error("Pick a product");
                if (!adjust.qty) return toast.error("Enter a quantity (+/-)");
                updateProduct(p.id, { stock: Math.max(0, p.stock + adjust.qty) });
                logMovement({ productId: p.id, productName: p.name, qty: adjust.qty, reason: adjust.reason, reference: "-", note: adjust.note, createdBy: "Bilal (Admin)" });
                toast.success("Stock updated");
                setAdjust(null);
              }}>Apply</ActionButton>
            </>
          }
        >
          <div className="space-y-3">
            <SelectField
              label="Product"
              value={adjust.productId}
              onChange={(v) => setAdjust({ ...adjust, productId: v })}
              options={products.map((p) => ({ value: p.id, label: `${p.name} · ${p.stock} in stock` }))}
            />
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Quantity change (±)" type="number" value={String(adjust.qty)} onChange={(v) => setAdjust({ ...adjust, qty: Number(v) })} />
              <SelectField
                label="Reason"
                value={adjust.reason}
                onChange={(v) => setAdjust({ ...adjust, reason: v as MovementReason })}
                options={[
                  { value: "adjustment", label: "Adjustment" },
                  { value: "damage", label: "Damage" },
                  { value: "return", label: "Return" },
                  { value: "transfer", label: "Transfer" },
                  { value: "purchase", label: "Purchase" },
                ]}
              />
            </div>
            <Field label="Note" value={adjust.note} onChange={(v) => setAdjust({ ...adjust, note: v })} textarea />
          </div>
        </Modal>
      )}
    </div>
  );
}

function StockTable({ rows, onAdjust }: { rows: ReturnType<typeof useCatalog.getState>["products"]; onAdjust: (id: string) => void }) {
  if (rows.length === 0) return <EmptyState title="Nothing here" hint="Try adjusting your filters." />;
  return (
    <div className="border border-border overflow-x-auto">
      <table className="w-full text-sm min-w-[700px]">
        <thead className="bg-secondary text-xs uppercase tracking-widest">
          <tr>
            <th className="text-left p-3">Product</th>
            <th className="text-left p-3">SKU</th>
            <th className="text-left p-3">Category</th>
            <th className="text-left p-3">On hand</th>
            <th className="text-left p-3">Status</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const status = p.stock === 0 ? "out" : p.stock <= 5 ? "low" : "ok";
            return (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-12 bg-secondary overflow-hidden"><img src={p.images[0]} alt="" className="h-full w-full object-cover" /></div>
                    <div className="min-w-0"><div className="font-medium truncate">{p.name}</div><div className="text-xs text-muted-foreground">/{p.slug}</div></div>
                  </div>
                </td>
                <td className="p-3 font-mono text-xs">{p.id.slice(0, 8).toUpperCase()}</td>
                <td className="p-3 capitalize">{p.category}</td>
                <td className="p-3 font-semibold">{p.stock}</td>
                <td className="p-3">
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-1 ${status === "out" ? "bg-sale text-primary-foreground" : status === "low" ? "bg-accent text-accent-foreground" : "bg-secondary"}`}>
                    {status === "out" ? "Out" : status === "low" ? "Low" : "In stock"}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => onAdjust(p.id)} className="text-xs uppercase tracking-widest underline">Adjust</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MovementTable({ rows }: { rows: Movement[] }) {
  if (rows.length === 0) return <EmptyState title="No movements" hint="Stock movements you log will appear here." />;
  return (
    <div className="border border-border overflow-x-auto">
      <table className="w-full text-sm min-w-[700px]">
        <thead className="bg-secondary text-xs uppercase tracking-widest">
          <tr>
            <th className="text-left p-3">Date</th>
            <th className="text-left p-3">Product</th>
            <th className="text-left p-3">Reason</th>
            <th className="text-left p-3">Reference</th>
            <th className="text-left p-3">Qty</th>
            <th className="text-left p-3">By</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} className="border-t border-border">
              <td className="p-3 text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</td>
              <td className="p-3">{m.productName}<div className="text-xs text-muted-foreground truncate max-w-[240px]">{m.note}</div></td>
              <td className="p-3"><StatusPill status={m.reason} /></td>
              <td className="p-3 font-mono text-xs">{m.reference}</td>
              <td className={`p-3 font-semibold ${m.qty < 0 ? "text-sale" : ""}`}>{m.qty > 0 ? `+${m.qty}` : m.qty}</td>
              <td className="p-3 text-xs text-muted-foreground">{m.createdBy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Timeline({ movements }: { movements: Movement[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, Movement[]>();
    movements.forEach((m) => {
      const key = new Date(m.createdAt).toLocaleDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    return Array.from(map.entries());
  }, [movements]);

  if (grouped.length === 0) return <EmptyState title="No timeline events" />;

  return (
    <div className="space-y-6">
      {grouped.map(([date, items]) => (
        <div key={date}>
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">{date}</div>
          <div className="border-l border-border pl-5 space-y-4">
            {items.map((m) => (
              <div key={m.id} className="relative">
                <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{m.productName}</span>
                  <StatusPill status={m.reason} />
                  <span className={`font-semibold ${m.qty < 0 ? "text-sale" : ""}`}>{m.qty > 0 ? `+${m.qty}` : m.qty}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{m.createdBy} · {new Date(m.createdAt).toLocaleTimeString()} · {m.note}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
// helper to satisfy `newId` import unused warning
void newId;
