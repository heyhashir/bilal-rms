import { useState } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { ActionButton } from "@/components/admin/primitives";
import type { PosSale } from "@/lib/admin-types";
import type { StorefrontSettings } from "@/lib/catalog-types";
import { adminPosApi } from "@/lib/admin-pos-api";
import { printingClient, hasOneClickPrinting } from "@/lib/printing-client";
import { getDesktopBridge } from "@/lib/desktop-bridge";
import { PrinterProfilesModal } from "./PrinterProfilesModal";

export function ReceiptPrintButton({ sale, settings, onReprint }: {
  sale: PosSale; settings: StorefrontSettings | null; onReprint: (sale: PosSale) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState(false);
  const print = async () => {
    if (busy) return;
    if (!hasOneClickPrinting()) { setSetup(true); return; }
    setBusy(true);
    try {
      if (!(await printingClient.getProfiles()).receipt?.printerName) { setSetup(true); return; }
      let printable = sale;
      if (sale.syncedStatus === "synced") {
        try { printable = (await adminPosApi.recordReprint(sale.saleNumber)).sale; onReprint(printable); }
        catch { /* A failed audit request must not disable offline printing. */ }
      }
      await printingClient.receipt({ sale: printable, settings });
      toast.success("Receipt sent to saved printer");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to print receipt"); }
    finally { setBusy(false); }
  };
  return <>
    <ActionButton onClick={print} disabled={busy}><Printer className="h-3.5 w-3.5" />{busy ? "Sending..." : "Print"}</ActionButton>
    <ActionButton variant="ghost" onClick={() => setSetup(true)}>Printer preset</ActionButton>
    {!getDesktopBridge() && <ActionButton variant="ghost" onClick={() => window.print()}>Browser print dialog</ActionButton>}
    {setup && <PrinterProfilesModal onClose={() => setSetup(false)} />}
  </>;
}
