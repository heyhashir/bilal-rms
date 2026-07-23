import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { adminSettingsApi } from "@/lib/admin-settings-api";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import type { ShippingZone, StorefrontSettings } from "@/lib/catalog-types";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

const emptySettings: StorefrontSettings = {
  id: "",
  name: "",
  logoPrimaryText: "BALY",
  logoSecondaryText: "By Bilal Garments",
  logoTertiaryText: "EST 2001",
  promoRibbonText: "Free shipping over Rs. 6,000\nNew drop\nAW26 collection live now\nCOD available across Pakistan\nEasy 7-day returns",
  promoRibbonItems: [],
  tagline: "",
  description: "",
  email: "",
  phone: "",
  address: "",
  currency: "PKR",
  currencySymbol: "Rs.",
  invoicePrefix: "BALY",
  receiptPrefix: "BALY",
  thermalHeader: "",
  thermalFooter: "",
  barcodePrefix: "BALY",
  qrPrefix: "BALYQ",
  instagram: "",
  facebook: "",
  tiktok: "",
  metaTitle: "",
  metaDescription: "",
};

const emptyZone = (): ShippingZone => ({ id: "", name: "", city: "", fee: 0, freeAbove: null, isActive: true, isUniversal: false });

function AdminSettings() {
  const [settings, setSettings] = useState<StorefrontSettings>(emptySettings);
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const { data } = useQuery({
    queryKey: queryKeys.admin.settings,
    queryFn: adminSettingsApi.settings,
  });
  const saveSettings = useMutation({
    mutationFn: adminSettingsApi.updateSettings,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings }),
        queryClient.invalidateQueries({ queryKey: queryKeys.catalog.settings }),
        queryClient.invalidateQueries({ queryKey: queryKeys.catalog.bootstrap }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pos.settings }),
      ]);
      toast.success("Settings saved");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to save settings"));
    },
  });
  const saveZone = useMutation({
    mutationFn: adminSettingsApi.saveShippingZone,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings });
      toast.success("Shipping zone saved");
      setEditingZone(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to save zone"));
    },
  });
  const removeZone = useMutation({
    mutationFn: adminSettingsApi.deleteShippingZone,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings });
      toast.success("Shipping zone deleted");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to delete zone"));
    },
  });

  useEffect(() => {
    if (!data) return;
    setSettings(data.settings);
    setZones(data.shippingZones);
  }, [data]);

  const save = async () => {
    saveSettings.mutate({
      name: settings.name,
      logoPrimaryText: settings.logoPrimaryText,
      logoSecondaryText: settings.logoSecondaryText,
      logoTertiaryText: settings.logoTertiaryText,
      promoRibbonText: settings.promoRibbonText,
      tagline: settings.tagline,
      description: settings.description,
      email: settings.email,
      phone: settings.phone,
      address: settings.address,
      currencySymbol: settings.currencySymbol,
      invoicePrefix: settings.invoicePrefix,
      receiptPrefix: settings.receiptPrefix,
      thermalHeader: settings.thermalHeader,
      thermalFooter: settings.thermalFooter,
      barcodePrefix: settings.barcodePrefix,
      qrPrefix: settings.qrPrefix,
      instagram: settings.instagram,
      facebook: settings.facebook,
      tiktok: settings.tiktok,
      metaTitle: settings.metaTitle,
      metaDescription: settings.metaDescription,
    });
  };

  return (
    <div className="max-w-4xl space-y-10">
      <section>
        <h2 className="display mb-5 text-2xl">Brand</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Brand name" value={settings.name} onChange={(v) => setSettings({ ...settings, name: v })} />
          <Field label="Tagline" value={settings.tagline} onChange={(v) => setSettings({ ...settings, tagline: v })} />
          <Field label="Logo primary line" value={settings.logoPrimaryText} onChange={(v) => setSettings({ ...settings, logoPrimaryText: v })} />
          <Field label="Logo secondary line" value={settings.logoSecondaryText} onChange={(v) => setSettings({ ...settings, logoSecondaryText: v })} />
          <Field label="Logo tertiary line" value={settings.logoTertiaryText} onChange={(v) => setSettings({ ...settings, logoTertiaryText: v })} />
          <Field
            label="Top ribbon messages"
            value={settings.promoRibbonText}
            onChange={(v) => setSettings({ ...settings, promoRibbonText: v })}
            className="md:col-span-2"
            textarea
          />
          <Field label="Description" value={settings.description} onChange={(v) => setSettings({ ...settings, description: v })} className="md:col-span-2" textarea />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Add one ribbon message per line. The storefront marquee will rotate these lines in order.
        </p>
      </section>

      <section>
        <h2 className="display mb-5 text-2xl">Contact</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Email" value={settings.email} onChange={(v) => setSettings({ ...settings, email: v })} />
          <Field label="Phone" value={settings.phone} onChange={(v) => setSettings({ ...settings, phone: v })} />
          <Field label="Address" value={settings.address} onChange={(v) => setSettings({ ...settings, address: v })} className="md:col-span-2" />
        </div>
      </section>

      <section>
        <h2 className="display mb-5 text-2xl">Storefront</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Currency symbol" value={settings.currencySymbol} onChange={(v) => setSettings({ ...settings, currencySymbol: v })} />
          <Field label="Invoice prefix" value={settings.invoicePrefix} onChange={(v) => setSettings({ ...settings, invoicePrefix: v })} />
          <Field label="Receipt prefix" value={settings.receiptPrefix} onChange={(v) => setSettings({ ...settings, receiptPrefix: v })} />
          <Field label="Barcode prefix" value={settings.barcodePrefix} onChange={(v) => setSettings({ ...settings, barcodePrefix: v })} />
          <Field label="QR prefix" value={settings.qrPrefix} onChange={(v) => setSettings({ ...settings, qrPrefix: v })} />
          <Field label="Thermal header" value={settings.thermalHeader} onChange={(v) => setSettings({ ...settings, thermalHeader: v })} className="md:col-span-2" textarea />
          <Field label="Thermal footer" value={settings.thermalFooter} onChange={(v) => setSettings({ ...settings, thermalFooter: v })} className="md:col-span-2" textarea />
          <Field label="Meta title" value={settings.metaTitle} onChange={(v) => setSettings({ ...settings, metaTitle: v })} className="md:col-span-2" />
          <Field label="Meta description" value={settings.metaDescription} onChange={(v) => setSettings({ ...settings, metaDescription: v })} className="md:col-span-2" textarea />
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="display text-2xl">Shipping zones</h2>
          <button onClick={() => setEditingZone(emptyZone())} className="inline-flex items-center gap-2 bg-primary px-4 py-2.5 text-xs uppercase tracking-widest text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Add zone
          </button>
        </div>
        <div className="border border-border">
          {zones.map((zone) => (
            <div key={zone.id} className="flex items-center gap-3 border-b border-border p-4 last:border-0">
              <div className="flex-1">
                <div className="font-medium">{zone.name}</div>
                <div className="text-xs text-muted-foreground">{zone.label ?? zone.city} · Rs. {zone.fee} · {zone.freeAbove ? `Free above Rs. ${zone.freeAbove}` : "No free shipping threshold"}</div>
              </div>
              <button onClick={() => setEditingZone(zone)} className="text-xs uppercase tracking-widest underline">Edit</button>
              <button
                onClick={async () => {
                  if (confirm(`Delete ${zone.name}?`)) {
                    removeZone.mutate(zone.id);
                  }
                }}
                className="p-2 hover:bg-sale hover:text-primary-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="flex gap-3">
        <button onClick={() => void save()} className="bg-primary px-6 py-3 text-xs uppercase tracking-widest text-primary-foreground">Save settings</button>
      </div>

      {editingZone && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setEditingZone(null)}>
          <div className="w-full max-w-lg bg-background p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="display mb-4 text-xl">{editingZone.id ? "Edit shipping zone" : "New shipping zone"}</h3>
            <div className="grid gap-3">
              <Field label="Name" value={editingZone.name} onChange={(v) => setEditingZone({ ...editingZone, name: v })} />
              <label className="flex items-center gap-2 text-xs uppercase tracking-widest">
                <input
                  type="checkbox"
                  checked={editingZone.isUniversal ?? editingZone.city === "ALL_CITIES"}
                  onChange={(event) =>
                    setEditingZone({
                      ...editingZone,
                      isUniversal: event.target.checked,
                      city: event.target.checked ? "ALL_CITIES" : "",
                      name: event.target.checked && !editingZone.name ? "All cities" : editingZone.name,
                    })
                  }
                />
                All cities fallback
              </label>
              <Field
                label="City"
                value={editingZone.city === "ALL_CITIES" ? "" : editingZone.city}
                onChange={(v) => setEditingZone({ ...editingZone, city: v, isUniversal: false })}
              />
              <Field label="Fee" type="number" value={String(editingZone.fee)} onChange={(v) => setEditingZone({ ...editingZone, fee: Number(v) })} />
              <Field label="Free above" type="number" value={editingZone.freeAbove === null ? "" : String(editingZone.freeAbove)} onChange={(v) => setEditingZone({ ...editingZone, freeAbove: v ? Number(v) : null })} />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setEditingZone(null)} className="border border-border px-5 py-3 text-xs uppercase tracking-widest">Cancel</button>
              <button
                onClick={() => saveZone.mutate({
                  ...editingZone,
                  city: editingZone.isUniversal ? "ALL_CITIES" : editingZone.city,
                })}
                className="bg-primary px-6 py-3 text-xs uppercase tracking-widest text-primary-foreground"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", textarea, className = "" }: { label: string; value: string; onChange: (v: string) => void; type?: string; textarea?: boolean; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
      )}
    </label>
  );
}
