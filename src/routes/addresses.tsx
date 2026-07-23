import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, Star } from "lucide-react";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { accountApi } from "@/lib/account-api";
import { getErrorMessage } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import type { Address } from "@/lib/account-types";
import { toast } from "sonner";

export const Route = createFileRoute("/addresses")({
  head: () => ({ meta: [{ title: "Saved addresses — Bilal Garments" }] }),
  component: Addresses,
});

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
const empty = (): Address => ({ id: uid(), label: "Home", fullName: "", phone: "", line1: "", city: "", postal: "", country: "Pakistan", isDefault: false });

function Addresses() {
  const { user, isPending } = useProtectedUser();
  const [editing, setEditing] = useState<Address | null>(null);
  const { data: addresses = [] } = useQuery({
    queryKey: queryKeys.account.addresses,
    queryFn: async () => (await accountApi.addresses()).addresses,
    enabled: Boolean(user),
  });
  const invalidateAddresses = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.account.addresses });
  };
  const saveAddress = useMutation({
    mutationFn: async (draft: Address) => {
      const payload = {
        label: draft.label,
        fullName: draft.fullName,
        phone: draft.phone,
        line1: draft.line1,
        line2: draft.line2,
        city: draft.city,
        postal: draft.postal,
        country: draft.country,
        isDefault: draft.isDefault || addresses.length === 0,
      };
      return addresses.find((entry) => entry.id === draft.id)
        ? accountApi.updateAddress(draft.id, payload)
        : accountApi.createAddress(payload);
    },
    onSuccess: async () => {
      await invalidateAddresses();
      toast.success("Address saved");
      setEditing(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to save address"));
    },
  });
  const deleteAddress = useMutation({
    mutationFn: accountApi.deleteAddress,
    onSuccess: async () => {
      await invalidateAddresses();
      toast.success("Removed");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to remove address"));
    },
  });
  const setDefaultAddress = useMutation({
    mutationFn: accountApi.setDefaultAddress,
    onSuccess: async () => {
      await invalidateAddresses();
      toast.success("Default updated");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to update default address"));
    },
  });

  if (isPending || !user) return null;

  const save = async () => {
    if (!editing) return;
    if (!editing.fullName || !editing.line1) return toast.error("Name and address are required");
    saveAddress.mutate(editing);
  };

  return (
    <div className="container-bg py-12 md:py-16">
      <div className="flex items-end justify-between border-b border-border pb-6 mb-10">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Account</div>
          <h1 className="display text-4xl md:text-5xl">Saved addresses.</h1>
        </div>
        <button onClick={() => setEditing(empty())} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 text-xs uppercase tracking-widest">
          <Plus className="h-3.5 w-3.5" /> Add address
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="bg-secondary p-12 text-center">
          <p className="text-muted-foreground mb-4">You haven't saved any addresses yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <div key={a.id} className="border border-border p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="display text-lg">{a.label}</h3>
                  {a.isDefault && <span className="text-[10px] uppercase tracking-widest px-2 py-1 bg-accent text-accent-foreground">Default</span>}
                </div>
                <div className="flex gap-1">
                  {!a.isDefault && (
                    <button onClick={() => setDefaultAddress.mutate(a.id)} className="p-2 hover:bg-secondary" title="Set default">
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button onClick={() => setEditing(a)} className="p-2 hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { if (confirm("Remove address?")) deleteAddress.mutate(a.id); }} className="p-2 hover:bg-sale hover:text-primary-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="text-sm">{a.fullName}</div>
              <div className="text-sm text-muted-foreground">{a.line1}</div>
              <div className="text-sm text-muted-foreground">{a.city} {a.postal} · {a.country}</div>
              <div className="text-sm text-muted-foreground mt-1">{a.phone}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 text-xs">
        <Link to="/account" className="underline underline-offset-4 text-muted-foreground">← Back to account</Link>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-background w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border">
              <h3 className="display text-xl">{user.addresses.find((a) => a.id === editing.id) ? "Edit address" : "New address"}</h3>
            </div>
            <div className="p-5 grid gap-3">
              <Field label="Label" value={editing.label} onChange={(v) => setEditing({ ...editing, label: v })} />
              <Field label="Full name" value={editing.fullName} onChange={(v) => setEditing({ ...editing, fullName: v })} />
              <Field label="Phone" value={editing.phone} onChange={(v) => setEditing({ ...editing, phone: v })} />
              <Field label="Address line" value={editing.line1} onChange={(v) => setEditing({ ...editing, line1: v })} />
              <Field label="Address line 2" value={editing.line2 ?? ""} onChange={(v) => setEditing({ ...editing, line2: v })} />
              <div className="grid grid-cols-3 gap-3">
                <Field label="City" value={editing.city} onChange={(v) => setEditing({ ...editing, city: v })} />
                <Field label="Postal" value={editing.postal} onChange={(v) => setEditing({ ...editing, postal: v })} />
                <Field label="Country" value={editing.country} onChange={(v) => setEditing({ ...editing, country: v })} />
              </div>
              <label className="flex items-center gap-2 text-xs uppercase tracking-widest">
                <input type="checkbox" checked={editing.isDefault} onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })} /> Set as default
              </label>
            </div>
            <div className="p-5 border-t border-border flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="px-5 py-3 text-xs uppercase tracking-widest border border-border">Cancel</button>
              <button onClick={save} className="bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-widest">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
    </label>
  );
}
