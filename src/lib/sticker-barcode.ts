import JsBarcode from "jsbarcode";

// Conservative retail-label profile: about two dots per module on a 203 dpi printer.
export const BARCODE_MODULE_MM = 0.25;
export const BARCODE_QUIET_MODULES = 10;
export const STICKER_PADDING_MM = 1.2;

export function encodeStickerBarcode(value: string) {
  const result: { encodings?: { data: string }[] } = {};
  const encode = JsBarcode as unknown as (target: typeof result, value: string, options: { format: string }) => void;
  try {
    if (!value) return null;
    encode(result, value, { format: "CODE128" });
    const bars = result.encodings?.map((entry) => entry.data).join("");
    if (!bars) return null;
    const modules = bars.length + BARCODE_QUIET_MODULES * 2;
    return { bars, modules, widthMm: modules * BARCODE_MODULE_MM };
  } catch {
    return null;
  }
}

export function stickerBarcodeFits(value: string, labelWidthMm: number, labelHeightMm: number) {
  const encoding = encodeStickerBarcode(value);
  return Boolean(encoding && Number.isFinite(labelWidthMm) && Number.isFinite(labelHeightMm) && labelWidthMm <= 150 && labelHeightMm <= 150 && encoding.widthMm + STICKER_PADDING_MM * 2 <= labelWidthMm && labelHeightMm >= 25);
}

// Public inventory identifiers, not authentication tokens. Database uniqueness still applies on save.
export function newShortBarcode(existing: Set<string> = new Set()) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const random = crypto.getRandomValues(new Uint32Array(3));
    const letters = String.fromCharCode(65 + random[0] % 26, 65 + random[1] % 26);
    const code = `${letters}-${String(random[2] % 10_000).padStart(4, "0")}`;
    if (existing.has(code)) continue;
    existing.add(code);
    return code;
  }
  throw new Error("Unable to allocate an unused barcode. Please try again.");
}
