import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ActionButton, Field, Modal } from "@/components/admin/primitives";
import { getDesktopBridge, type PrinterProfiles } from "@/lib/desktop-bridge";

const defaults: PrinterProfiles = {
  receipt: { printerName: "", rollWidthMm: 72, paddingMm: 3, feedOffsetMm: 0, copies: 1, landscape: false },
  sticker: { printerName: "", widthMm: 38, heightMm: 25, orientation: 0, offsetXmm: 0, offsetYmm: 0, gapMm: 2, copies: 1, design: "standard" },
};

export function PrinterProfilesModal({ onClose }: { onClose: () => void }) {
  const bridge = getDesktopBridge();
  const [printers, setPrinters] = useState<Array<{ name: string; displayName: string; isDefault: boolean }>>([]);
  const [profiles, setProfiles] = useState<PrinterProfiles>(() => bridge?.getPrinterProfiles() ?? defaults);

  useEffect(() => {
    void bridge?.listPrinters().then(setPrinters).catch(() => toast.error("Unable to read Windows printers"));
  }, [bridge]);

  if (!bridge) return null;
  const receipt = profiles.receipt ?? defaults.receipt!;
  const sticker = profiles.sticker ?? defaults.sticker!;
  const printerSelect = (value: string, onChange: (value: string) => void, label: string) => (
    <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="border border-border bg-background px-3 py-2 text-sm normal-case">
        <option value="">Select installed printer</option>
        {printers.map((printer) => <option key={printer.name} value={printer.name}>{printer.displayName}{printer.isDefault ? " (Windows default)" : ""}</option>)}
      </select>
    </label>
  );

  return (
    <Modal title="Printer presets" onClose={onClose} wide footer={<><ActionButton variant="ghost" onClick={onClose}>Cancel</ActionButton><ActionButton onClick={() => {
      if (!receipt.printerName || !sticker.printerName) {
        toast.error("Select both the receipt and sticker printers");
        return;
      }
      bridge.savePrinterProfiles({ receipt, sticker });
      toast.success("Printer presets saved on this PC");
      onClose();
    }}>Save presets</ActionButton></>}>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-3 border border-border p-4">
          <div><div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Receipt printer</div><p className="mt-1 text-sm">XP-T361U: 72 mm roll, approximately 66 mm printable content.</p></div>
          {printerSelect(receipt.printerName, (printerName) => setProfiles((current) => ({ ...current, receipt: { ...receipt, printerName } })), "Windows printer")}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Roll width (mm)" type="number" value={String(receipt.rollWidthMm)} onChange={(value) => setProfiles((current) => ({ ...current, receipt: { ...receipt, rollWidthMm: Number(value) || 72 } }))} />
            <Field label="Padding (mm)" type="number" value={String(receipt.paddingMm)} onChange={(value) => setProfiles((current) => ({ ...current, receipt: { ...receipt, paddingMm: Number(value) || 3 } }))} />
            <Field label="Feed offset (mm)" type="number" value={String(receipt.feedOffsetMm)} onChange={(value) => setProfiles((current) => ({ ...current, receipt: { ...receipt, feedOffsetMm: Number(value) || 0 } }))} />
            <Field label="Copies" type="number" value={String(receipt.copies)} onChange={(value) => setProfiles((current) => ({ ...current, receipt: { ...receipt, copies: Math.max(1, Number(value) || 1) } }))} />
          </div>
        </section>
        <section className="space-y-3 border border-border p-4">
          <div><div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Sticker printer</div><p className="mt-1 text-sm">Dimensions and offsets are stored separately from the bill printer.</p></div>
          {printerSelect(sticker.printerName, (printerName) => setProfiles((current) => ({ ...current, sticker: { ...sticker, printerName } })), "Windows printer")}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Width (mm)" type="number" value={String(sticker.widthMm)} onChange={(value) => setProfiles((current) => ({ ...current, sticker: { ...sticker, widthMm: Number(value) || 38 } }))} />
            <Field label="Height (mm)" type="number" value={String(sticker.heightMm)} onChange={(value) => setProfiles((current) => ({ ...current, sticker: { ...sticker, heightMm: Number(value) || 25 } }))} />
            <Field label="Horizontal offset" type="number" value={String(sticker.offsetXmm)} onChange={(value) => setProfiles((current) => ({ ...current, sticker: { ...sticker, offsetXmm: Number(value) || 0 } }))} />
            <Field label="Vertical offset" type="number" value={String(sticker.offsetYmm)} onChange={(value) => setProfiles((current) => ({ ...current, sticker: { ...sticker, offsetYmm: Number(value) || 0 } }))} />
            <Field label="Label gap (mm)" type="number" value={String(sticker.gapMm)} onChange={(value) => setProfiles((current) => ({ ...current, sticker: { ...sticker, gapMm: Number(value) || 0 } }))} />
            <Field label="Copies" type="number" value={String(sticker.copies)} onChange={(value) => setProfiles((current) => ({ ...current, sticker: { ...sticker, copies: Math.max(1, Number(value) || 1) } }))} />
          </div>
        </section>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Heat density, print speed, cutter, and gap-sensor calibration remain in the Windows printer driver.</p>
    </Modal>
  );
}
