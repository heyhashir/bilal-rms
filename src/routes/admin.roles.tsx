import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminBackofficeApi } from "@/lib/admin-backoffice-api";
import { getErrorMessage } from "@/lib/api";
import type { StaffAccount } from "@/lib/admin-types";
import { queryClient } from "@/lib/query-client";
import { PageHeader, ActionButton, Field, Modal, SelectField, StatusPill } from "@/components/admin/primitives";

export const Route = createFileRoute("/admin/roles")({
  component: AdminRoles,
});

type Draft = {
  id?: string;
  email: string;
  name: string;
  phone: string;
  role: "admin" | "manager" | "staff";
  password: string;
  isActive: boolean;
};

const emptyDraft = (): Draft => ({
  email: "",
  name: "",
  phone: "",
  role: "staff",
  password: "",
  isActive: true,
});

function AdminRoles() {
  const [editing, setEditing] = useState<Draft | null>(null);
  const { data: accounts = [] } = useQuery({
    queryKey: ["admin", "staff-accounts"],
    queryFn: async () => (await adminBackofficeApi.staffAccounts()).accounts,
  });

  const saveAccount = useMutation({
    mutationFn: adminBackofficeApi.saveStaffAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "staff-accounts"] });
      setEditing(null);
      toast.success("Staff account saved");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Unable to save staff account")),
  });

  const archiveAccount = useMutation({
    mutationFn: adminBackofficeApi.deleteStaffAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "staff-accounts"] });
      toast.success("Staff account deactivated");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Unable to deactivate staff account")),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Access control"
        title="Staff accounts."
        description="Separate back-office logins for admins, managers, and POS/catalog staff."
        action={
          <ActionButton onClick={() => setEditing(emptyDraft())}>
            <Plus className="h-3.5 w-3.5" /> Add account
          </ActionButton>
        }
      />

      <div className="overflow-x-auto border border-border">
        <table className="min-w-[760px] w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-widest">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Last login</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-t border-border">
                <td className="p-3">
                  <div className="font-medium">{account.name}</div>
                  <div className="text-xs text-muted-foreground">{account.phone || "No phone"}</div>
                </td>
                <td className="p-3">{account.email}</td>
                <td className="p-3 uppercase">{account.role}</td>
                <td className="p-3"><StatusPill status={account.isActive ? "active" : "inactive"} /></td>
                <td className="p-3">{account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString() : "Never"}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <ActionButton
                      variant="ghost"
                      onClick={() =>
                        setEditing({
                          id: account.id,
                          email: account.email,
                          name: account.name,
                          phone: account.phone,
                          role: account.role,
                          password: "",
                          isActive: account.isActive,
                        })
                      }
                    >
                      Edit
                    </ActionButton>
                    <ActionButton
                      variant="danger"
                      onClick={() => {
                        if (confirm(`Deactivate ${account.name}?`)) {
                          archiveAccount.mutate(account.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Deactivate
                    </ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <StaffAccountModal
          draft={editing}
          onClose={() => setEditing(null)}
          onSave={(payload) => saveAccount.mutate(payload)}
        />
      )}
    </div>
  );
}

function StaffAccountModal({
  draft,
  onClose,
  onSave,
}: {
  draft: Draft;
  onClose: () => void;
  onSave: (payload: Draft) => void;
}) {
  const [form, setForm] = useState(draft);

  return (
    <Modal
      title={form.id ? "Edit staff account" : "New staff account"}
      onClose={onClose}
      footer={
        <>
          <ActionButton variant="ghost" onClick={onClose}>Cancel</ActionButton>
          <ActionButton onClick={() => onSave(form)}>Save</ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
        <Field label="Email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
        <Field label="Phone" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
        <SelectField
          label="Role"
          value={form.role}
          onChange={(value) => setForm((current) => ({ ...current, role: value as Draft["role"] }))}
          options={[
            { value: "staff", label: "Staff" },
            { value: "manager", label: "Manager" },
            { value: "admin", label: "Admin" },
          ]}
        />
        <Field
          label={form.id ? "New password (optional)" : "Password"}
          value={form.password}
          type="password"
          onChange={(value) => setForm((current) => ({ ...current, password: value }))}
        />
        <label className="flex items-center gap-2 text-xs uppercase tracking-widest">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
          />
          Active
        </label>
      </div>
    </Modal>
  );
}
