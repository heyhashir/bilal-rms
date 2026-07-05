import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useSizeCharts, type SizeChartRow } from "@/store/settings";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/size-charts")({
  component: AdminSizeCharts,
});

function AdminSizeCharts() {
  const { charts, upsert, remove, addRow, updateRow, removeRow } = useSizeCharts();
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const create = () => {
    const key = newKey.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    if (!key || !newLabel) return toast.error("Key and label required");
    if (charts.find((c) => c.key === key)) return toast.error("Key already exists");
    upsert({ key, label: newLabel, rows: [] });
    setNewKey(""); setNewLabel("");
    toast.success("Size chart created");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="display text-2xl">Size charts ({charts.length})</h2>
      </div>

      <div className="flex flex-col md:flex-row gap-2 mb-8">
        <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="key (e.g. footwear)" className="border border-border bg-background px-3 py-2.5 text-sm md:w-48" />
        <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Label (e.g. Footwear EU)" className="flex-1 border border-border bg-background px-3 py-2.5 text-sm" />
        <button onClick={create} className="bg-primary text-primary-foreground px-4 text-xs uppercase tracking-widest inline-flex items-center gap-1 py-2.5">
          <Plus className="h-3.5 w-3.5" /> New chart
        </button>
      </div>

      <div className="space-y-8">
        {charts.map((c) => (
          <ChartEditor
            key={c.key}
            chart={c}
            onLabel={(label) => upsert({ ...c, label })}
            onAddRow={(r) => addRow(c.key, r)}
            onUpdateRow={(i, r) => updateRow(c.key, i, r)}
            onRemoveRow={(i) => removeRow(c.key, i)}
            onDelete={() => {
              if (confirm(`Delete chart "${c.label}"?`)) {
                remove(c.key);
                toast.success("Deleted");
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ChartEditor({
  chart, onLabel, onAddRow, onUpdateRow, onRemoveRow, onDelete,
}: {
  chart: { key: string; label: string; rows: SizeChartRow[] };
  onLabel: (l: string) => void;
  onAddRow: (r: SizeChartRow) => void;
  onUpdateRow: (i: number, r: SizeChartRow) => void;
  onRemoveRow: (i: number) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<SizeChartRow>({ size: "", chest: "", length: "" });

  return (
    <div className="border border-border">
      <div className="bg-secondary px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{chart.key}</div>
          <input value={chart.label} onChange={(e) => onLabel(e.target.value)} className="w-full bg-transparent font-medium outline-none" />
        </div>
        <button onClick={onDelete} className="p-2 hover:bg-sale hover:text-primary-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-widest text-muted-foreground">
          <tr><th className="text-left p-3">Size</th><th className="text-left p-3">Chest</th><th className="text-left p-3">Length</th><th></th></tr>
        </thead>
        <tbody>
          {chart.rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
              <td className="p-2"><input value={r.size} onChange={(e) => onUpdateRow(i, { ...r, size: e.target.value })} className="w-full bg-transparent outline-none" /></td>
              <td className="p-2"><input value={r.chest} onChange={(e) => onUpdateRow(i, { ...r, chest: e.target.value })} className="w-full bg-transparent outline-none" /></td>
              <td className="p-2"><input value={r.length} onChange={(e) => onUpdateRow(i, { ...r, length: e.target.value })} className="w-full bg-transparent outline-none" /></td>
              <td className="p-2 text-right"><button onClick={() => onRemoveRow(i)} className="p-1 hover:bg-sale hover:text-primary-foreground"><Trash2 className="h-3 w-3" /></button></td>
            </tr>
          ))}
          <tr className="border-t border-border bg-background">
            <td className="p-2"><input value={draft.size} onChange={(e) => setDraft({ ...draft, size: e.target.value })} placeholder="M" className="w-full bg-transparent outline-none" /></td>
            <td className="p-2"><input value={draft.chest} onChange={(e) => setDraft({ ...draft, chest: e.target.value })} placeholder="98" className="w-full bg-transparent outline-none" /></td>
            <td className="p-2"><input value={draft.length} onChange={(e) => setDraft({ ...draft, length: e.target.value })} placeholder="70" className="w-full bg-transparent outline-none" /></td>
            <td className="p-2 text-right">
              <button
                onClick={() => { if (!draft.size) return; onAddRow(draft); setDraft({ size: "", chest: "", length: "" }); }}
                className="text-xs uppercase tracking-widest px-2 py-1 bg-primary text-primary-foreground"
              >Add</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
