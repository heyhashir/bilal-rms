import { app, BrowserWindow } from "electron";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createPrinter } from "../printing.mjs";

app.disableHardwareAcceleration();
app.on("window-all-closed", () => {});
const output = path.resolve("test-results/printing");
app.setPath("userData", path.join(output, "electron-test-profile"));
app.whenReady().then(async () => {
await fs.mkdir(output, { recursive: true });
const results = [];
let current = "receipt";
const profiles = {
  receipt: { printerName: "QA PDF", rollWidthMm: 72, paddingMm: 3, feedOffsetMm: 0, copies: 1 },
  sticker: { printerName: "QA PDF", widthMm: 50, heightMm: 25, orientation: 0, offsetXmm: 0, offsetYmm: 0, gapMm: 2, copies: 1, design: "standard" },
};
class PdfWindow {
  constructor(options) {
    const window = new BrowserWindow(options);
    window.webContents.print = (options, callback) => {
      void (async () => {
        const pdf = await window.webContents.printToPDF({ printBackground: true, margins: { top: 0, bottom: 0, left: 0, right: 0 },
          pageSize: { width: options.pageSize.width / 25400, height: options.pageSize.height / 25400 }, preferCSSPageSize: true });
        await fs.writeFile(path.join(output, `${current}.pdf`), pdf);
        results.push({ kind: current, pageSize: options.pageSize });
        callback(true);
      })().catch(error => callback(false, error.message));
    };
    return window;
  }
}
try {
  const print = createPrinter({ BrowserWindow: PdfWindow, getProfiles: () => profiles, listPrinters: async () => [{ name: "QA PDF" }] });
  const sale = { saleNumber: "QA-RECEIPT-LONG-ID", receipt: { lookupCode: "BI-1234", invoiceNumber: "QA-2026-00001" },
    total: 2500, paymentMethod: "cash", customerName: "Walk-in", items: Array.from({ length: 30 }, (_, i) => ({
      name: `Cotton jeans with a long product description ${i + 1}`, size: "28", color: "Beige", qty: 1, unitPrice: 2495, lineTotal: 2495,
    })) };
  await print("receipt", { sale, settings: { returnPolicy: "Exchange within seven days with original receipt. ".repeat(8) } });
  assert.equal(results[0].pageSize.width, 72000);
  assert.ok(results[0].pageSize.height > 250000, "long receipts must grow to fit actual content");
  current = "sticker";
  const html = await fs.readFile(path.join(output, "sticker.html"), "utf8");
  await print("sticker", { html, widthMm: 50, heightMm: 25, orientation: 0 });
  assert.deepEqual(results[1].pageSize, { width: 50000, height: 25000 });
  await fs.writeFile(path.join(output, "dimensions.json"), JSON.stringify(results, null, 2));
  console.log("Electron rendered receipt and generated sticker PDFs at exact physical dimensions", results);
} catch (error) { console.error(error); process.exitCode = 1; }
finally { app.exit(process.exitCode || 0); }
});
