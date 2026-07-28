import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
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

  return (
    <Modal
      title={`Barcode stickers - ${product.name}`}
      onClose={onClose}
      wide
      footer={
        <>
          <ActionButton variant="ghost" onClick={onClose}>Close</ActionButton>
          <ActionButton
            onClick={() => {
              if (printable.length === 0) return;
              window.print();
            }}
          >
            <Printer className="h-3.5 w-3.5" /> Print {printable.length} sticker{printable.length === 1 ? "" : "s"}
          </ActionButton>
        </>
      }
    >
      <style media="print">{`
        @page { size: 1.5in 1in; margin: 0; }
        .barcode-sticker-print, .barcode-sticker-print * { visibility: visible !important; }
        .barcode-sticker-print {
          position: absolute !important;
          inset: 0 auto auto 0 !important;
          display: block !important;
          width: 1.5in !important;
          margin: 0 !important;
        }
        .barcode-sticker {
          width: 1.5in !important;
          height: 1in !important;
          overflow: hidden !important;
          break-after: page;
          page-break-after: always;
        }
      `}</style>

      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Labels print at 1.50 x 1.00 inches in landscape. Quantities default to current stock and can be changed without affecting inventory.
        </p>
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
              <BarcodeSticker label={labels[0]} />
            </div>
          </div>
        )}
      </div>

      <div className="barcode-sticker-print hidden">
        {printable.map(({ label, index }) => (
          <BarcodeSticker key={`${label.variantId || label.productId}-${index}`} label={label} />
        ))}
      </div>
    </Modal>
  );
}

function BarcodeSticker({ label }: { label: Label }) {
  return (
    <article className="barcode-sticker flex h-[1in] w-[1.5in] overflow-hidden bg-white font-sans text-black">
      <div className="flex w-[34%] flex-col items-center justify-center bg-black px-1 text-center text-white">
        <div className="text-[13px] font-black tracking-[0.12em]">BALY</div>
        <div className="text-[5px] uppercase tracking-wide">By Bilal Garments</div>
        <div className="mt-1 text-[5px] tracking-widest text-[#f4b000]">EST 2001</div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col px-1.5 py-1">
        <div className="truncate border-b border-black pb-0.5 text-[7px] font-black uppercase">{label.name}</div>
        <div className="mt-0.5 grid grid-cols-[27px_1fr] text-[5.5px] leading-[1.35]">
          <span>Code</span><strong>: {label.sku || "-"}</strong>
          {label.size && <><span>Size</span><strong>: {label.size}</strong></>}
          {label.color && <><span>Color</span><strong>: {label.color}</strong></>}
          <span>Price</span><strong>: {formatPrice(label.price)}</strong>
        </div>
        <div className="mt-auto text-center">
          <Barcode value={label.barcode} height={5.5} scale={1} className="mx-auto max-h-[10mm] max-w-full" />
          <div className="truncate font-mono text-[5px] font-bold leading-none">{label.barcode}</div>
        </div>
      </div>
    </article>
  );
}
