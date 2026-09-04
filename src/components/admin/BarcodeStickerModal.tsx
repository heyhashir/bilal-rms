import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, RotateCw, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { adminCatalogApi } from "@/lib/admin-catalog-api";
import type { Product } from "@/lib/catalog-types";
import { ActionButton, Modal } from "@/components/admin/primitives";
import { StickerBarcode } from "@/components/pos/StickerBarcode";
import { encodeStickerBarcode, stickerBarcodeFits, STICKER_PADDING_MM } from "@/lib/sticker-barcode";
import { STICKER_CSS } from "@/lib/sticker-layout";
import { formatPrice } from "@/lib/format";
import { getDesktopBridge } from "@/lib/desktop-bridge";
import { PrinterProfilesModal } from "@/components/pos/PrinterProfilesModal";

type Label = Awaited<ReturnType<typeof adminCatalogApi.barcodeLabels>>["labels"][number];

export const LABEL_SIZE_PRESETS = [
  { id: "38x25", name: "38 × 25 mm (1.5″ × 1.0″ - Standard PK Apparel)", widthMm: 38, heightMm: 25 },
  { id: "40x28", name: "40 × 28 mm (Retail Tag)", widthMm: 40, heightMm: 28 },
  { id: "50x25", name: "50 × 25 mm (2.0″ × 1.0″)", widthMm: 50, heightMm: 25 },
  { id: "50x30", name: "50 × 30 mm (2.0″ × 1.2″ - Medium Tag)", widthMm: 50, heightMm: 30 },
  { id: "58x40", name: "58 × 40 mm (Large Tag)", widthMm: 58, heightMm: 40 },
  { id: "custom", name: "Custom Size (Specify mm)", widthMm: 38, heightMm: 25 },
];

export const ROTATION_OPTIONS = [
  { id: "0", name: "0° Normal (Horizontal Across Roll)", deg: 0 },
  { id: "90", name: "90° Rotate Clockwise (Fix Vertical Feed)", deg: 90 },
  { id: "270", name: "270° Rotate Counter-Clockwise", deg: 270 },
  { id: "180", name: "180° Inverted", deg: 180 },
];

export function cleanShortTitle(name: string): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (trimmed.length > 25) {
    return trimmed.slice(0, 24).trim();
  }
  return trimmed;
}

export function BarcodeStickerModal({
  product,
  variantId,
  onClose,
}: {
  product: Product;
  variantId?: string | null;
  onClose: () => void;
}) {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "barcode-labels", product.id, variantId ?? "all"],
    queryFn: () => adminCatalogApi.barcodeLabels({ productId: product.id, variantId }),
  });
  const labels = data?.labels;
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [template, setTemplate] = useState<"standard" | "compact" | "branded">("standard");
  const [customTitle, setCustomTitle] = useState(() => cleanShortTitle(product.name));
  const [sizePreset, setSizePreset] = useState("38x25");
  const [customWidth, setCustomWidth] = useState(38);
  const [customHeight, setCustomHeight] = useState(25);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [showPrinterProfiles, setShowPrinterProfiles] = useState(false);
  const printRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const desktopProfile = getDesktopBridge()?.getPrinterProfiles().sticker;
    const saved = desktopProfile ?? (() => {
      try { return JSON.parse(localStorage.getItem("bilal_rms_sticker_layout") ?? "null"); } catch { return null; }
    })();
    if (!saved) return;
    setCustomWidth(saved.widthMm ?? 38);
    setCustomHeight(saved.heightMm ?? 25);
    setSizePreset(LABEL_SIZE_PRESETS.some((entry) => entry.id === `${saved.widthMm}x${saved.heightMm}`) ? `${saved.widthMm}x${saved.heightMm}` : "custom");
    setRotation(saved.orientation ?? 0);
    setTemplate(saved.design ?? "standard");
  }, []);

  const selectedPreset = LABEL_SIZE_PRESETS.find((p) => p.id === sizePreset) ?? LABEL_SIZE_PRESETS[0];
  const widthMm = sizePreset === "custom" ? customWidth : selectedPreset.widthMm;
  const heightMm = sizePreset === "custom" ? customHeight : selectedPreset.heightMm;
  const unsafeLabels = (labels ?? []).filter((label) => (quantities[label.variantId || label.productId] ?? 0) > 0 && !stickerBarcodeFits(label.barcode, widthMm, heightMm));
  const requiredWidth = Math.ceil(Math.max(0, ...unsafeLabels.map((label) => (encodeStickerBarcode(label.barcode)?.widthMm ?? 0) + STICKER_PADDING_MM * 2)));

  useEffect(() => {
    if (!labels || labels.length === 0) return;
    setQuantities(
      Object.fromEntries(labels.map((label) => [label.variantId || label.productId, Math.max(0, label.stock)])),
    );
  }, [labels]);

  const printable = useMemo(
    () =>
      (labels ?? []).flatMap((label) => {
        const count = Math.min(5_000, Math.max(0, quantities[label.variantId || label.productId] ?? 0));
        return Array.from({ length: count }, (_, index) => ({ label, index }));
      }),
    [labels, quantities],
  );

  const generatePrintHtml = () => {
    if (!printRootRef.current) return "";

    const printableClone = printRootRef.current.cloneNode(true) as HTMLDivElement;

    const isRotated = rotation === 90 || rotation === 270;
    const effectiveWidth = isRotated ? heightMm : widthMm;
    const effectiveHeight = isRotated ? widthMm : heightMm;

    return `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Bilal Garments Barcode Stickers</title>
          <style>
            @page {
              size: ${effectiveWidth}mm ${effectiveHeight}mm;
              margin: 0;
            }
            html, body {
              width: ${effectiveWidth}mm;
              height: ${effectiveHeight}mm;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              font-family: Arial, Helvetica, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            *, *::before, *::after {
              box-sizing: border-box !important;
            }
            .barcode-sticker-sheet {
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              width: ${effectiveWidth}mm !important;
              height: ${effectiveHeight}mm !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
              break-after: page !important;
              page-break-after: always !important;
            }
            .barcode-sticker-sheet:last-child {
              break-after: auto !important;
              page-break-after: auto !important;
            }
            .barcode-sticker-inner {
              width: ${widthMm}mm !important;
              height: ${heightMm}mm !important;
              margin: 0 !important;
              padding: 0 !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              text-align: center !important;
              background: #ffffff !important;
              color: #000000 !important;
              overflow: hidden !important;
              ${
                rotation !== 0
                  ? `transform: rotate(${rotation}deg); transform-origin: center center;`
                  : ""
              }
            }
            ${STICKER_CSS}
          </style>
        </head>
        <body>${printableClone.outerHTML}</body>
      </html>`;
  };

  const printStickers = async () => {
    if (!printRootRef.current || isFetching || printable.length === 0 || unsafeLabels.length > 0) return;

    const html = generatePrintHtml();
    if (!html) return;

    // 1. Try native desktop electron printing if running inside desktop app
    if (window.bilalDesktop?.printStickers) {
      const profiles = window.bilalDesktop.getPrinterProfiles();
      if (!profiles.sticker?.printerName) {
        setShowPrinterProfiles(true);
        toast.error("Select and save the sticker printer first");
        return;
      }
      window.bilalDesktop.savePrinterProfiles({
        ...profiles,
        sticker: { ...profiles.sticker, widthMm, heightMm, orientation: rotation, design: template },
      });
      try {
        await window.bilalDesktop.printStickers({
          html,
          widthMm,
          heightMm,
          landscape: rotation === 90 || rotation === 270,
        });
        toast.success(`Sent ${printable.length} stickers to desktop thermal printer`);
        return;
      } catch (err) {
        console.warn("Desktop print error, falling back to browser window:", err);
      }
    }

    localStorage.setItem("bilal_rms_sticker_layout", JSON.stringify({ widthMm, heightMm, orientation: rotation, design: template }));

    // 2. Browser print window fallback
    const printWindow = window.open("", "_blank", "popup=yes,width=600,height=800");
    if (!printWindow) {
      toast.error("Allow pop-ups for this site to print barcode stickers");
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    let printed = false;
    const triggerPrint = () => {
      if (printed || printWindow.closed) return;
      printed = true;
      printWindow.focus();
      printWindow.print();
    };
    void printWindow.document.fonts.ready.then(() => printWindow.requestAnimationFrame(triggerPrint));
  };

  return (
    <Modal
      title={`Barcode stickers - ${product.name}`}
      onClose={onClose}
      wide
      footer={
        <>
          <ActionButton variant="ghost" onClick={onClose}>
            Close
          </ActionButton>
          {window.bilalDesktop && <ActionButton variant="ghost" onClick={() => setShowPrinterProfiles(true)}>Change printer preset</ActionButton>}
          <ActionButton onClick={printStickers} disabled={isFetching || printable.length === 0 || unsafeLabels.length > 0}>
            <Printer className="h-3.5 w-3.5" /> Print {printable.length} sticker{printable.length === 1 ? "" : "s"}
          </ActionButton>
        </>
      }
    >
      <div className="space-y-6">
        <style>{STICKER_CSS}</style>
        {/* Printer & Calibration Controls */}
        <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <Settings2 className="h-4 w-4" /> Thermal Printer & Label Calibration
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Label Size Preset */}
            <div>
              <label htmlFor="barcode-label-roll-size" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Label Roll Size
              </label>
              <select
                id="barcode-label-roll-size"
                value={sizePreset}
                onChange={(e) => setSizePreset(e.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-2 text-xs font-medium outline-none focus:border-foreground"
              >
                {LABEL_SIZE_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom dimensions if chosen */}
            {sizePreset === "custom" ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="barcode-label-width" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Width (mm)
                  </label>
                  <input
                    id="barcode-label-width"
                    type="number"
                    min={20}
                    max={150}
                    value={customWidth}
                    onChange={(e) => setCustomWidth(Number(e.target.value) || 38)}
                    className="w-full rounded border border-border bg-background px-3 py-2 text-xs font-medium outline-none focus:border-foreground"
                  />
                </div>
                <div>
                  <label htmlFor="barcode-label-height" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Height (mm)
                  </label>
                  <input
                    id="barcode-label-height"
                    type="number"
                    min={25}
                    max={150}
                    value={customHeight}
                    onChange={(e) => setCustomHeight(Number(e.target.value) || 25)}
                    className="w-full rounded border border-border bg-background px-3 py-2 text-xs font-medium outline-none focus:border-foreground"
                  />
                </div>
              </div>
            ) : (
              /* Label Template */
              <div>
                <label htmlFor="barcode-sticker-design" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sticker Design
                </label>
                <select
                  id="barcode-sticker-design"
                  value={template}
                  onChange={(event) => setTemplate(event.target.value as "standard" | "compact" | "branded")}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-xs font-medium outline-none focus:border-foreground"
                >
                  <option value="standard">Bilal Garments Standard (Store + Price + Size)</option>
                  <option value="compact">Compact Retail (High Density)</option>
                  <option value="branded">BALY Luxury Branded</option>
                </select>
              </div>
            )}

            {/* Orientation / Rotation */}
            <div>
              <label htmlFor="barcode-print-orientation" className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Print Orientation</span>
                <span className="text-[10px] text-amber-600 font-bold">Fix Rotation</span>
              </label>
              <select
                id="barcode-print-orientation"
                value={String(rotation)}
                onChange={(e) => setRotation(Number(e.target.value) as 0 | 90 | 180 | 270)}
                className="w-full rounded border border-border bg-background px-3 py-2 text-xs font-medium outline-none focus:border-foreground"
              >
                {ROTATION_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Short Title on Sticker */}
          <div>
            <label className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Sticker Product Title (Short Name)</span>
              <span className="text-[10px] text-muted-foreground">Max 25 characters</span>
            </label>
            <input
              type="text"
              maxLength={28}
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. SHALWAR KAMEEZ 0020"
              className="w-full rounded border border-border bg-background px-3 py-2 text-xs font-bold uppercase outline-none focus:border-foreground"
            />
          </div>

          <div className="rounded border border-amber-400/40 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-900 dark:text-amber-300">
            <strong>Print at 100% / Actual size:</strong> Select the size of the actual label roll, no margins, and turn browser headers/footers off. Do not use Fit to page or Credit Card as a substitute. Barcodes need clear white space on both sides. Rotate only to match the printer feed.
          </div>
          {unsafeLabels.length > 0 && <div role="alert" className="border border-destructive p-3 text-sm text-destructive">
            {unsafeLabels.length} barcode(s) cannot safely fit this label. Minimum label width for these codes: {requiredWidth} mm; minimum height: 25 mm.
            For small labels, close this window, edit the product, choose Generate short variant barcodes (or Generate short barcode), then Save and reopen stickers. Existing codes are not changed automatically. Invalid codes must be replaced before printing.
          </div>}
        </div>

        {/* Variant Table & Quantities */}
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Preparing barcode labels...</div>
        ) : (
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-widest">
                <tr>
                  <th className="p-3 text-left">Variant</th>
                  <th className="p-3 text-left">SKU</th>
                  <th className="p-3 text-left">Barcode</th>
                  <th className="p-3 text-left">Stock</th>
                  <th className="p-3 text-left">Print Copies</th>
                </tr>
              </thead>
              <tbody>
                {(labels ?? []).map((label) => {
                  const key = label.variantId || label.productId;
                  return (
                    <tr key={key} className="border-t border-border">
                      <td className="p-3 font-medium">
                        {[label.size, label.color].filter(Boolean).join(" / ") || "Standard"}
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{label.sku || product.slug}</td>
                      <td className="p-3 font-mono text-xs font-semibold">{label.barcode}</td>
                      <td className="p-3">{label.stock}</td>
                      <td className="p-3">
                        <input
                          type="number"
                          min={0}
                          max={5_000}
                          value={quantities[key] ?? 0}
                          onChange={(event) =>
                            setQuantities((current) => ({
                              ...current,
                              [key]: Math.min(5_000, Math.max(0, Number(event.target.value) || 0)),
                            }))
                          }
                          className="w-24 rounded border border-border bg-background px-3 py-1.5 text-xs font-bold"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Live Sticker Preview */}
        {labels?.[0] && (
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                Live Sticker Preview ({widthMm}mm × {heightMm}mm @ {rotation}°)
              </span>
              <button
                type="button"
                onClick={() => setRotation((prev) => ((prev + 90) % 360) as 0 | 90 | 180 | 270)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <RotateCw className="h-3.5 w-3.5" /> Rotate 90°
              </button>
            </div>
            <div className="flex items-center justify-center rounded-lg border border-border bg-neutral-200 p-6 dark:bg-neutral-800">
              <div
                style={{
                  width: `${widthMm}mm`,
                  height: `${heightMm}mm`,
                  transform: `rotate(${rotation}deg)`,
                  transition: "transform 0.2s ease",
                }}
                className="shadow-md rounded-sm overflow-hidden bg-white"
              >
                <BarcodeSticker
                  label={labels[0]}
                  template={template}
                  customTitle={customTitle}
                  widthMm={widthMm}
                  heightMm={heightMm}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden printable DOM container */}
      <div ref={printRootRef} className="barcode-sticker-print hidden">
        {printable.map(({ label, index }) => (
          <div className="barcode-sticker-sheet" key={`${label.variantId || label.productId}-${index}`}>
            <div className="barcode-sticker-inner">
              <BarcodeSticker
                label={label}
                template={template}
                customTitle={customTitle}
                widthMm={widthMm}
                heightMm={heightMm}
              />
            </div>
          </div>
        ))}
      </div>
      {showPrinterProfiles && <PrinterProfilesModal onClose={() => setShowPrinterProfiles(false)} />}
    </Modal>
  );
}

function BarcodeSticker({
  label,
  template,
  customTitle,
  widthMm,
  heightMm,
}: {
  label: Label;
  template: "standard" | "compact" | "branded";
  customTitle?: string;
  widthMm: number;
  heightMm: number;
}) {
  const formattedPrice = `Rs. ${Number(label.price).toLocaleString("en-PK")}`;
  const colorText = label.color || "MIX";
  const sizeText = label.size ? `SIZE: ${label.size}` : "";
  const displayTitle = (customTitle || cleanShortTitle(label.name)).toUpperCase();
  const barcode = <div className="sticker-barcode-wrap">
    {stickerBarcodeFits(label.barcode, widthMm, heightMm)
      ? <StickerBarcode value={label.barcode} />
      : <div className="sticker-unsafe">Barcode too wide or invalid. Use a short code such as BA-1234 or a larger label.</div>}
    <div className="sticker-barcode-value">{label.barcode}</div>
  </div>;

  if (template === "standard") {
    return (
      <article className="barcode-sticker barcode-sticker--standard">
        <div className="sticker-standard-header">
          BILAL GARMENTS
        </div>
        <div className="sticker-standard-title">
          {displayTitle}
        </div>
        <div className="sticker-standard-row">
          <span>{colorText}</span>
          <span>{sizeText}</span>
        </div>
        <div className="sticker-standard-price">
          <span>PRICE:</span>
          <span>{formattedPrice}</span>
        </div>
        {barcode}
      </article>
    );
  }

  if (template === "compact") {
    return (
      <article className="barcode-sticker barcode-sticker--compact">
        <div className="sticker-title">{displayTitle}</div>
        <div className="sticker-compact-meta">
          {label.size && <span>Size {label.size}</span>}
          {label.color && <span>{label.color}</span>}
        </div>
        <div className="sticker-compact-price">{formattedPrice}</div>
        {barcode}
      </article>
    );
  }

  return (
    <article className="barcode-sticker barcode-sticker--branded">
      <div className="sticker-branded-top">
        <div className="sticker-brand-panel">
          <div className="sticker-brand-name">BALY</div>
          <div className="sticker-brand-subtitle">BILAL GARMENTS</div>
          <div className="sticker-brand-est">EST 2001</div>
        </div>
      <div className="sticker-content">
        <div className="sticker-title">{displayTitle}</div>
        <div className="sticker-details">
          <span>Code</span><strong>:</strong><strong>{label.barcode}</strong>
          <span>Size</span><strong>:</strong><strong>{label.size || "-"}</strong>
          <span>Color</span><strong>:</strong><strong>{colorText}</strong>
          <span>Price</span><strong>:</strong><strong>{formattedPrice}</strong>
        </div>
      </div>
      </div>
      {barcode}
    </article>
  );
}
