import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export function Barcode({
  value,
  height = 12,
  scale = 2,
  className = "",
}: {
  value: string;
  height?: number;
  scale?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;

    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        width: scale,
        height: height * 4,
        displayValue: false,
        margin: 3,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch {
      const context = ref.current.getContext("2d");
      context?.clearRect(0, 0, ref.current.width, ref.current.height);
    }
  }, [height, scale, value]);

  return <canvas ref={ref} aria-label={`Barcode ${value}`} className={className} />;
}
