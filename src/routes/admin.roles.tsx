import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2, ShieldCheck } from "lucide-react";
import { useRetail, type RoleDef, newId } from "@/store/retail";
import { PageHeader, ActionButton, Modal, Field, EmptyState } from "@/components/admin/primitives";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/roles")({
  component: AdminRoles,
});

const ALL_PERMISSIONS = [
  "orders.read", "orders.create", "orders.update",
  "products.read", "products.create", "products.update", "products.delete",
  "inventory.read", "inventory.update",
  "purchase.read", "purchase.create",
  "customers.read", "customers.update",
  "returns.read", "returns.update",
  "reports.read",
  "cms.update",
  "settings.update",
];

const empty = (): RoleDef => ({ id: newId(), name: "", description: "", permissions: [] });

function AdminRoles() {
  const { roles, employees, upsertRole, deleteRole } = useRetail();
  const [editing, setEditing] = useState<RoleDef | null>(null);

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title={`Roles & permissions (${roles.length})`}
        description="Blueprint access levels for the retail team."
        action={<ActionButton onClick={() => setEditing(empty())}><Plus className="h-3.5 w-3.5" /> New role</ActionButton>}
      />
      {roles.length === 0 ? (
        <EmptyState title="No roles defined" />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {roles.map((r) => {
            const holders = employees.filter((e) => e.role === r.name).length;
            return (
              <div key={r.id} className="border border-border p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      <h3 className="display text-lg">{r.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(r)} className="p-2 hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /></button>
                    {r.name !== "Admin" && (
                      <button onClick={() => { if (confirm(`Delete role "${r.name}"?`)) { deleteRole(r.id); toast.success("Role deleted"); } }} className="p-2 hover:bg-sale hover:text-primary-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                </div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Permissions</div>
                <div className="flex flex-wrap gap-1.5">
                  {r.permissions.map((p) => (
                    <span key={p} className="text-[10px] uppercase tracking-widest px-2 py-1 bg-secondary">{p}</span>
                  ))}
                </div>
                <div className="mt-3 text-xs text-muted-foreground">{holders} employee{holders === 1 ? "" : "s"}</div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal
          title={roles.find((x) => x.id === editing.id) ? "Edit role" : "New role"}
          onClose={() => setEditing(null)}
          wide
          footer={
            <>
              <ActionButton variant="ghost" onClick={() => setEditing(null)}>Cancel</ActionButton>
              <ActionButton onClick={() => {
                if (!editing.name) return toast.error("Name required");
                upsertRole(editing);
                toast.success("Role saved");
                setEditing(null);
              }}>Save</ActionButton>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
            <Field label="Description" value={editing.description} onChange={(v) => setEditing({ ...editing, description: v })} textarea />
            <div>
              <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Permissions</span>
              <div className="grid grid-cols-2 gap-2 border border-border p-3 max-h-64 overflow-auto">
                {ALL_PERMISSIONS.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={editing.permissions.includes(p) || editing.permissions.includes("*")}
                      onChange={(e) => setEditing({
                        ...editing,
                        permissions: e.target.checked
                          ? [...editing.permissions.filter((x) => x !== "*"), p]
                          : editing.permissions.filter((x) => x !== p && x !== "*"),
                      })}
                    /> {p}
                  </label>
                ))}
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs uppercase tracking-widest">
                <input type="checkbox" checked={editing.permissions.includes("*")} onChange={(e) => setEditing({ ...editing, permissions: e.target.checked ? ["*"] : [] })} /> Full access (*)
              </label>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
