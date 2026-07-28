import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { adminCatalogApi } from "@/lib/admin-catalog-api";
import type { Product } from "@/lib/catalog-types";
import { ActionButton, Modal } from "@/components/admin/primitives";
import { Barcode } from "@/components/pos/Barcode";
import { formatPrice } from "@/lib/format";

type Label = Awaited<ReturnType<typeof adminCatalogApi.barcodeLabels>>["labels"][number];

export function BarcodeStickerModal({
  product,
  variantId,
  onClose,
}: {
  product: Product;
  variantId?: string | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "barcode-labels", product.id, variantId ?? "all"],
    queryFn: () => adminCatalogApi.barcodeLabels({ productId: product.id, variantId }),
  });
  const labels = data?.labels;
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [template, setTemplate] = useState<"branded" | "compact">("branded");
  const printRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!labels || labels.length === 0) return;
    setQuantities(
      Object.fromEntries(labels.map((label) => [label.variantId || label.productId, Math.max(0, label.stock)])),
    );
    setTemplate(labels[0].labelTemplate);
  }, [labels]);

  const printable = useMemo(
    () =>
      (labels ?? []).flatMap((label) => {
        const count = Math.min(5_000, Math.max(0, quantities[label.variantId || label.productId] ?? 0));
        return Array.from({ length: count }, (_, index) => ({ label, index }));
      }),
    [labels, quantities],
  );

  const printStickers = () => {
    if (!printRootRef.current || printable.length === 0) return;

    const printWindow = window.open("", "_blank", "popup=yes,width=600,height=800");
    if (!printWindow) {
      toast.error("Allow pop-ups for this site to print barcode stickers");
      return;
    }

    const printableClone = printRootRef.current.cloneNode(true) as HTMLDivElement;
    const sourceCanvases = Array.from(printRootRef.current.querySelectorAll("canvas"));
    const clonedCanvases = Array.from(printableClone.querySelectorAll("canvas"));
    sourceCanvases.forEach((canvas, index) => {
      const clonedCanvas = clonedCanvases[index];
      if (!clonedCanvas) return;
      const barcodeImage = document.createElement("img");
      barcodeImage.src = canvas.toDataURL("image/png");
      barcodeImage.alt = canvas.getAttribute("aria-label") ?? "Barcode";
      barcodeImage.className = canvas.className;
      clonedCanvas.replaceWith(barcodeImage);
    });

    printWindow.document.write(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>BALY barcode stickers</title>
          <style>
            @page { size: 1.5in 1in; margin: 0; }
            html, body {
              width: 1.5in;
              height: 1in;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              font-family: Arial, Helvetica, sans-serif !important;
            }
            *, *::before, *::after { box-sizing: border-box !important; }
            .barcode-sticker-print {
              display: block !important;
              width: 1.5in !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .barcode-sticker-print,
            .barcode-sticker-print * {
              visibility: visible !important;
              box-sizing: border-box !important;
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
            }
            .barcode-sticker-sheet {
              display: block !important;
              position: relative !important;
              width: 1.5in !important;
              height: 1in !important;
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
            .barcode-sticker {
              display: flex !important;
              width: 1.5in !important;
              height: 1in !important;
              margin: 0 !important;
              overflow: hidden !important;
              background: #fff !important;
              color: #000 !important;
              font-family: Arial, Helvetica, sans-serif !important;
            }
            .barcode-sticker--branded .sticker-brand-panel { display: flex !important; width: 32% !important; flex: 0 0 32% !important; flex-direction: column !important; text-align: center !important; }
            .barcode-sticker--branded .sticker-brand-top { display: flex !important; height: 68% !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; padding: 1mm !important; background: #0b3158 !important; color: #ddb34d !important; }
            .sticker-brand-name { font-size: 8.5pt !important; font-weight: 900 !important; letter-spacing: .07em !important; line-height: 1 !important; }
            .sticker-brand-subtitle { margin-top: .7mm !important; font-size: 3.4pt !important; font-weight: 600 !important; line-height: 1.15 !important; }
            .sticker-brand-est { margin-top: .8mm !important; font-size: 3.4pt !important; letter-spacing: .12em !important; line-height: 1 !important; }
            .sticker-brand-mark { display: flex !important; flex: 1 !important; align-items: center !important; justify-content: center !important; color: #ad7b27 !important; font-size: 16pt !important; font-weight: 900 !important; line-height: 1 !important; }
            .sticker-content { display: flex !important; min-width: 0 !important; flex: 1 !important; flex-direction: column !important; padding: 1.2mm 1.3mm !important; }
            .sticker-title { overflow: hidden !important; border-bottom: .2mm solid #000 !important; padding-bottom: .6mm !important; color: #000 !important; font-size: 5.8pt !important; font-weight: 900 !important; line-height: 1.1 !important; text-overflow: ellipsis !important; text-transform: uppercase !important; white-space: nowrap !important; }
            .sticker-details { display: grid !important; grid-template-columns: 10mm 1.5mm 1fr !important; margin-top: .7mm !important; color: #000 !important; font-size: 4.4pt !important; line-height: 1.25 !important; }
            .sticker-details strong { overflow: hidden !important; font-weight: 800 !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
            .sticker-barcode-wrap { margin-top: auto !important; text-align: center !important; }
            .sticker-barcode { display: block !important; width: 100% !important; height: 8.5mm !important; margin: 0 auto !important; object-fit: contain !important; }
            .sticker-barcode-value { overflow: hidden !important; color: #000 !important; font-family: "Courier New", monospace !important; font-size: 3.7pt !important; font-weight: 700 !important; line-height: 1 !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
            .barcode-sticker--compact { display: flex !important; flex-direction: column !important; padding: 1.5mm !important; text-align: center !important; }
            .barcode-sticker--compact .sticker-title { font-size: 6.5pt !important; }
            .sticker-compact-meta { display: flex !important; justify-content: center !important; gap: 2mm !important; margin-top: .7mm !important; font-size: 4.4pt !important; font-weight: 700 !important; text-transform: uppercase !important; }
            .sticker-compact-price { margin-top: .4mm !important; font-size: 6.2pt !important; font-weight: 900 !important; }
            .barcode-sticker--compact .sticker-barcode { height: 9mm !important; }
            .barcode-sticker--compact .sticker-barcode-wrap { margin-top: auto !important; }
          </style>
        </head>
        <body>${printableClone.outerHTML}</body>
      </html>`);
    printWindow.document.close();

    let printed = false;
    const triggerPrint = () => {
      if (printed || printWindow.closed) return;
      printed = true;
      printWindow.focus();
      printWindow.print();
    };
    window.setTimeout(triggerPrint, 150);
  };

  return (
    <Modal
      title={`Barcode stickers - ${product.name}`}
      onClose={onClose}
      wide
      footer={
        <>
          <ActionButton variant="ghost" onClick={onClose}>Close</ActionButton>
          <ActionButton
            onClick={printStickers}
          >
            <Printer className="h-3.5 w-3.5" /> Print {printable.length} sticker{printable.length === 1 ? "" : "s"}
          </ActionButton>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Labels print at 1.50 x 1.00 inches in landscape. Quantities default to current stock and can be changed without affecting inventory.
        </p>
        <div className="border border-amber-400 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
          Printer setup: use a 38.1 x 25.4 mm label, one page per sheet, 100% scale, no margins,
          headers and footers off, and background graphics on. Chrome cannot disable headers and footers for you;
          leaving them enabled prints the date, title, and about:blank exactly as shown in the broken preview.
          Credit Card paper is not compatible.
        </div>
        <label className="block max-w-md">
          <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">Label template for this print job</span>
          <select
            value={template}
            onChange={(event) => setTemplate(event.target.value as "branded" | "compact")}
            className="w-full border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="branded">BALY branded with size and color</option>
            <option value="compact">Compact retail label</option>
          </select>
        </label>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Preparing barcode labels...</div>
        ) : (
          <div className="overflow-x-auto border border-border">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-widest">
                <tr>
                  <th className="p-3 text-left">Variant</th>
                  <th className="p-3 text-left">SKU</th>
                  <th className="p-3 text-left">Barcode</th>
                  <th className="p-3 text-left">Stock</th>
                  <th className="p-3 text-left">Labels</th>
                </tr>
              </thead>
              <tbody>
                {(labels ?? []).map((label) => {
                  const key = label.variantId || label.productId;
                  return (
                    <tr key={key} className="border-t border-border">
                      <td className="p-3">{[label.size, label.color].filter(Boolean).join(" / ") || "Simple product"}</td>
                      <td className="p-3 font-mono text-xs">{label.sku || product.slug}</td>
                      <td className="p-3 font-mono text-xs">{label.barcode}</td>
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
                          className="w-24 border border-border bg-background px-3 py-2"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {labels?.[0] && (
          <div>
            <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Print preview</div>
            <div className="inline-block border border-border bg-neutral-200 p-5">
              <BarcodeSticker label={labels[0]} template={template} />
            </div>
          </div>
        )}
      </div>

      <div ref={printRootRef} className="barcode-sticker-print hidden">
        {printable.map(({ label, index }) => (
          <div className="barcode-sticker-sheet" key={`${label.variantId || label.productId}-${index}`}>
            <BarcodeSticker label={label} template={template} />
          </div>
        ))}
      </div>
    </Modal>
  );
}

function BarcodeSticker({ label, template }: { label: Label; template: "branded" | "compact" }) {
  if (template === "compact") {
    return (
      <article className="barcode-sticker barcode-sticker--compact flex h-[1in] w-[1.5in] flex-col overflow-hidden bg-white px-1.5 py-1 text-center font-sans text-black">
        <div className="sticker-title truncate text-[8px] font-black uppercase tracking-wide">{label.name}</div>
        <div className="sticker-compact-meta mt-0.5 flex justify-center gap-2 text-[6px] font-semibold uppercase">
          {label.size && <span>Size {label.size}</span>}
          {label.color && <span>{label.color}</span>}
        </div>
        <div className="sticker-compact-price text-[8px] font-black">{formatPrice(label.price)}</div>
        <div className="sticker-barcode-wrap mt-auto">
          <Barcode value={label.barcode} height={8} scale={1} className="sticker-barcode mx-auto max-h-[12mm] max-w-full" />
          <div className="sticker-barcode-value truncate font-mono text-[5px] font-bold leading-none">{label.barcode}</div>
        </div>
      </article>
    );
  }

  return (
    <article className="barcode-sticker barcode-sticker--branded flex h-[1in] w-[1.5in] overflow-hidden bg-white font-sans text-black">
      <div className="sticker-brand-panel flex w-[34%] shrink-0 flex-col text-center">
        <div className="sticker-brand-top flex h-[66%] flex-col items-center justify-center bg-[#0b3158] px-1 text-[#ddb34d]">
          <div className="sticker-brand-name text-[12px] font-black tracking-[0.08em]">BALY</div>
          <div className="sticker-brand-subtitle text-[4.5px] font-semibold tracking-wide">by Bilal Garments</div>
          <div className="sticker-brand-est mt-1 text-[4.5px] tracking-widest">EST 2001</div>
        </div>
        <div className="sticker-brand-mark flex flex-1 items-center justify-center text-[20px] font-black leading-none text-[#ad7b27]">B</div>
      </div>
      <div className="sticker-content flex min-w-0 flex-1 flex-col px-1.5 py-1">
        <div className="sticker-title truncate border-b border-black pb-0.5 text-[7.5px] font-black uppercase">{label.name}</div>
        <div className="sticker-details mt-0.5 grid grid-cols-[24px_4px_1fr] text-[5.5px] leading-[1.3]">
          <span>Code</span><strong>:</strong><strong className="truncate">{label.sku || "-"}</strong>
          <span>Size</span><strong>:</strong><strong>{label.size || "-"}</strong>
          <span>Color</span><strong>:</strong><strong className="truncate">{label.color || "-"}</strong>
          <span>Price</span><strong>:</strong><strong>{formatPrice(label.price)}</strong>
        </div>
        <div className="sticker-barcode-wrap mt-auto text-center">
          <Barcode value={label.barcode} height={6.5} scale={1} className="sticker-barcode mx-auto max-h-[9mm] max-w-full" />
          <div className="sticker-barcode-value truncate font-mono text-[5px] font-bold leading-none">{label.barcode}</div>
        </div>
      </div>
    </article>
  );
}
