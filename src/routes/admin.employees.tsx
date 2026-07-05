import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRetail, type Employee, newId } from "@/store/retail";
import { PageHeader, Toolbar, StatusPill, ActionButton, Modal, Field, SelectField, EmptyState } from "@/components/admin/primitives";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/employees")({
  component: AdminEmployees,
});

const empty = (): Employee => ({
  id: newId(), name: "", email: "", phone: "", role: "Store Manager", status: "active", joinedAt: Date.now(),
});

function AdminEmployees() {
  const { employees, roles, upsertEmployee, deleteEmployee } = useRetail();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Employee | null>(null);

  const filtered = employees.filter((e) => `${e.name} ${e.email} ${e.role}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title={`Employees (${employees.length})`}
        action={<ActionButton onClick={() => setEditing(empty())}><Plus className="h-3.5 w-3.5" /> New employee</ActionButton>}
      />
      <Toolbar search={q} onSearch={setQ} />
      {filtered.length === 0 ? (
        <EmptyState title="No employees" />
      ) : (
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-secondary text-xs uppercase tracking-widest">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Contact</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Joined</th>
                <th className="text-left p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="p-3 font-medium">{e.name}</td>
                  <td className="p-3 text-xs text-muted-foreground">{e.email}<div>{e.phone}</div></td>
                  <td className="p-3">{e.role}</td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(e.joinedAt).toLocaleDateString()}</td>
                  <td className="p-3"><StatusPill status={e.status} /></td>
                  <td className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditing(e)} className="p-2 hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => { if (confirm(`Remove ${e.name}?`)) { deleteEmployee(e.id); toast.success("Removed"); } }} className="p-2 hover:bg-sale hover:text-primary-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
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
          title={employees.find((x) => x.id === editing.id) ? "Edit employee" : "New employee"}
          onClose={() => setEditing(null)}
          wide
          footer={
            <>
              <ActionButton variant="ghost" onClick={() => setEditing(null)}>Cancel</ActionButton>
              <ActionButton onClick={() => {
                if (!editing.name || !editing.email) return toast.error("Name and email required");
                upsertEmployee(editing);
                toast.success("Employee saved");
                setEditing(null);
              }}>Save</ActionButton>
            </>
          }
        >
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Full name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
            <Field label="Email" type="email" value={editing.email} onChange={(v) => setEditing({ ...editing, email: v })} />
            <Field label="Phone" value={editing.phone} onChange={(v) => setEditing({ ...editing, phone: v })} />
            <SelectField label="Role" value={editing.role} onChange={(v) => setEditing({ ...editing, role: v })} options={roles.map((r) => ({ value: r.name, label: r.name }))} />
            <SelectField label="Status" value={editing.status} onChange={(v) => setEditing({ ...editing, status: v as Employee["status"] })} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
            <Field label="Joined" type="date" value={new Date(editing.joinedAt).toISOString().slice(0, 10)} onChange={(v) => setEditing({ ...editing, joinedAt: new Date(v).getTime() })} />
          </div>
        </Modal>
      )}
    </div>
  );
}
