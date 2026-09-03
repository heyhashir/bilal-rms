import { BARCODE_QUIET_MODULES, encodeStickerBarcode } from "@/lib/sticker-barcode";

export function StickerBarcode({ value }: { value: string }) {
  const encoding = encodeStickerBarcode(value);
  if (!encoding) return <span role="alert">Invalid Code 128 value</span>;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`Barcode ${value}`}
      viewBox={`0 0 ${encoding.modules} 32`} preserveAspectRatio="none" shapeRendering="crispEdges"
      style={{ display: "block", width: `${encoding.widthMm}mm`, minWidth: `${encoding.widthMm}mm`, maxWidth: "none", height: "8mm", flexShrink: 0, margin: "0 auto" }}>
      <rect width={encoding.modules} height="32" fill="#fff" />
      {Array.from(encoding.bars.matchAll(/1+/g), (run) => (
        <rect key={run.index} x={BARCODE_QUIET_MODULES + run.index!} y="0" width={run[0].length} height="32" fill="#000" />
      ))}
    </svg>
  );
}
