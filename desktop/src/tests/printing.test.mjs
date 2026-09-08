import { test } from "node:test";
import assert from "node:assert/strict";
import { createPrinter, validatePrinterProfiles } from "../printing.mjs";
import { startPrintService } from "../print-service.mjs";

const profiles = {
  receipt: { printerName: "Receipt", rollWidthMm: 72, paddingMm: 3, feedOffsetMm: 0, copies: 1 },
  sticker: { printerName: "Labels", widthMm: 50, heightMm: 30, copies: 2, offsetXmm: 1, offsetYmm: 0, gapMm: 2, orientation: 90, design: "standard" },
};
const sale = { saleNumber: "QA-PRINT", total: 10, items: [{ name: "Test", qty: 1, unitPrice: 10, lineTotal: 10 }] };
const sticker = { html: '<!doctype html><html><head></head><body><div class="barcode-sticker-sheet"></div></body></html>', widthMm: 50, heightMm: 30, orientation: 90 };
function fixture({ success = true, clipped = false } = {}) {
  const windows = [];
  class Window {
    constructor() {
      windows.push(this);
      this.webContents = { setWindowOpenHandler() {}, on() {}, executeJavaScript: async () => ({ height: 800, clipped }),
        print: (options, callback) => { this.options = options; callback(success, "Printer offline"); } };
    }
    async loadURL(url) { this.html = decodeURIComponent(url.split(",").slice(1).join(",")); }
    isDestroyed() { return Boolean(this.destroyed); }
    destroy() { this.destroyed = true; }
  }
  return { windows, print: createPrinter({ BrowserWindow: Window, getProfiles: () => profiles, listPrinters: async () => [{ name: "Receipt" }, { name: "Labels" }] }) };
}
test("receipt uses actual measured height, 72 mm width and no driver scaling", async () => {
  const f = fixture(); await f.print("receipt", { sale });
  assert.deepEqual(f.windows[0].options.pageSize, { width: 72000, height: 213000 });
  assert.equal(f.windows[0].options.scaleFactor, 100);
  assert.equal(f.windows[0].options.silent, true);
  assert.equal(f.windows[0].options.deviceName, "Receipt");
  assert.match(f.windows[0].html, /BILAL GARMENTS/);
  assert.ok(f.windows[0].destroyed);
});
test("sticker gap does not enlarge page; rotation is not applied twice", async () => {
  const f = fixture(); await f.print("sticker", sticker);
  assert.deepEqual(f.windows[0].options.pageSize, { width: 50000, height: 30000 });
  assert.equal(f.windows[0].options.landscape, false);
  assert.equal(f.windows[0].options.deviceName, "Labels");
  assert.equal(f.windows[0].options.copies, 2);
  assert.match(f.windows[0].html, /left:1mm/);
});
test("failed jobs close their window, reject and never fall back", async () => {
  const f = fixture({ success: false });
  await assert.rejects(f.print("receipt", { sale }), /offline/);
  assert.ok(f.windows[0].destroyed);
});
test("invalid dimensions, clipped barcodes and stale presets are rejected", async () => {
  assert.throws(() => validatePrinterProfiles({ receipt: { ...profiles.receipt, rollWidthMm: -1 } }), /width/);
  assert.doesNotThrow(() => validatePrinterProfiles({ receipt: { ...profiles.receipt, paddingMm: 0 }, sticker: null }));
  await assert.rejects(fixture().print("sticker", { ...sticker, widthMm: 38 }), /preset changed/);
  await assert.rejects(fixture({ clipped: true }).print("sticker", sticker), /clipped/);
  await assert.rejects(fixture().print("sticker", { ...sticker, html: '<script>alert(1)</script><div class="barcode-sticker-sheet"></div>' }), /document header/);
  const print = createPrinter({ getProfiles: () => profiles, listPrinters: async () => [] });
  await assert.rejects(print("receipt", { sale }), /unavailable/);
});
test("loopback helper requires exact origin, host and pairing token", async () => {
  const jobs = [];
  const origin = "https://balybybilalgarments.com";
  const server = await startPrintService({ token: "test-private-token", origins: [origin], port: 0,
    getProfiles: () => profiles, saveProfiles: validatePrinterProfiles, listPrinters: async () => [],
    print: async (...args) => { jobs.push(args); return { ok: true }; } });
  try {
    const url = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(url + "/profiles")).status, 403);
    assert.equal((await fetch(url + "/profiles", { headers: { Origin: origin } })).status, 401);
    const headers = { Origin: origin, Authorization: "Bearer test-private-token", "Content-Type": "application/json" };
    assert.equal((await fetch(url + "/profiles", { headers: { ...headers, Origin: "https://evil.test" } })).status, 403);
    assert.deepEqual(await (await fetch(url + "/profiles", { headers })).json(), profiles);
    const preflight = await fetch(url + "/receipt", { method: "OPTIONS", headers: { Origin: origin } });
    assert.equal(preflight.headers.get("access-control-allow-private-network"), "true");
    assert.equal((await fetch(url + "/receipt", { method: "POST", headers, body: JSON.stringify({ sale }) })).status, 200);
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0][0], "receipt");
  } finally { await new Promise(resolve => server.close(resolve)); }
});
