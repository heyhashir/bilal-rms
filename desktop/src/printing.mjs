import { createReceiptHtml } from "./receipt-template.mjs";

const number = (value, min, max, label) => {
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${label} (${min}-${max})`);
  return value;
};

export function validatePrinterProfiles(profiles) {
  if (!profiles || typeof profiles !== "object" || Array.isArray(profiles)) throw new Error("Invalid printer profiles");
  for (const kind of ["receipt", "sticker"]) {
    const p = profiles?.[kind];
    if (!p) continue;
    if (typeof p.printerName !== "string" || !p.printerName.trim()) throw new Error(`Select a ${kind} printer`);
    p.copies = Number.isInteger(Number(p.copies)) ? Number(p.copies) : 1;
    number(p.copies, 1, 100, "copies");
    if (kind === "receipt") {
      p.rollWidthMm = Number.isFinite(Number(p.rollWidthMm)) ? Number(p.rollWidthMm) : 72;
      number(p.rollWidthMm, 38, 210, "receipt width");
      p.paddingMm = Number.isFinite(Number(p.paddingMm)) ? Number(p.paddingMm) : 3;
      number(p.paddingMm, 0, p.rollWidthMm / 4, "padding");
      p.feedOffsetMm = Number.isFinite(Number(p.feedOffsetMm)) ? Number(p.feedOffsetMm) : 0;
      number(p.feedOffsetMm, 0, 100, "feed offset");
    } else {
      p.widthMm = Number.isFinite(Number(p.widthMm)) ? Number(p.widthMm) : 38;
      number(p.widthMm, 20, 210, "label width");
      p.heightMm = Number.isFinite(Number(p.heightMm)) ? Number(p.heightMm) : 25;
      number(p.heightMm, 15, 300, "label height");
      p.offsetXmm = Number.isFinite(Number(p.offsetXmm)) ? Number(p.offsetXmm) : 0;
      number(p.offsetXmm, -10, 10, "horizontal offset");
      p.offsetYmm = Number.isFinite(Number(p.offsetYmm)) ? Number(p.offsetYmm) : 0;
      number(p.offsetYmm, -10, 10, "vertical offset");
      p.gapMm = Number.isFinite(Number(p.gapMm)) ? Number(p.gapMm) : 2;
      number(p.gapMm, 0, 20, "label gap");
      p.orientation = [0, 90, 180, 270].includes(Number(p.orientation)) ? Number(p.orientation) : 0;
      p.design = ["standard", "compact", "branded"].includes(p.design) ? p.design : "standard";
    }
  }
  return profiles;
}

export function createPrinter({ BrowserWindow, getProfiles, listPrinters }) {
  let active = false;
  return async (kind, payload) => {
    if (active) throw new Error("A print job is still being submitted. Wait before printing again.");
    active = true;
    let window;
    try {
      const profile = validatePrinterProfiles(getProfiles())[kind];
      if (!profile?.printerName) throw new Error(`Select and save a ${kind} printer preset first`);
      const availablePrinters = await listPrinters();
      const targetName = profile.printerName.trim().toLowerCase();
      const matched = availablePrinters.find(p => (p.name && p.name.trim().toLowerCase() === targetName) || (p.displayName && p.displayName.trim().toLowerCase() === targetName));
      if (!matched) {
        throw new Error(`Saved printer "${profile.printerName}" is unavailable. Reconnect it or change the printer preset.`);
      }
      const printDeviceName = matched.name || profile.printerName;
      let html;
      let widthMm;
      let heightMm;
      if (kind === "receipt") {
        if (!Array.isArray(payload?.sale?.items)) throw new Error("Invalid receipt");
        widthMm = profile.rollWidthMm;
        html = createReceiptHtml({ ...payload, profile });
      } else {
        if (payload.widthMm !== profile.widthMm || payload.heightMm !== profile.heightMm || payload.orientation !== profile.orientation) {
          throw new Error("Sticker preset changed. Reopen stickers to reload the saved dimensions.");
        }
        widthMm = profile.widthMm;
        heightMm = profile.heightMm;
        if (typeof payload.html !== "string" || !payload.html.includes("barcode-sticker-sheet")) throw new Error("Invalid sticker document");
        html = payload.html.replace("</head>", `<style>@page{size:${widthMm}mm ${heightMm}mm;margin:0}.barcode-sticker-inner{position:relative!important;left:${profile.offsetXmm}mm!important;top:${profile.offsetYmm}mm!important}</style></head>`);
      }
      // Printed HTML is data, never executable application content or a network client.
      if (!/^\s*<!doctype html>\s*<html[^>]*>\s*<head[^>]*>/i.test(html)) throw new Error("Invalid print document header");
      html = html.replace(/<head[^>]*>/i, `$&<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:">`);
      window = new BrowserWindow({ show: false, width: Math.ceil(widthMm * 96 / 25.4), height: 600,
        webPreferences: { sandbox: true, nodeIntegration: false, contextIsolation: true } });
      window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
      await window.loadURL(dataUrl);
      window.webContents.on("will-navigate", (event) => event.preventDefault());
      window.webContents.on("will-frame-navigate", (event) => event.preventDefault());
      const measured = await window.webContents.executeJavaScript(`(async () => {
        await document.fonts.ready;
        await Promise.all(Array.from(document.images, img => img.decode().catch(() => {})));
        const clipped = Array.from(document.querySelectorAll('.barcode-sticker-sheet')).some(sheet => {
          const page = sheet.getBoundingClientRect();
          return Array.from(sheet.querySelectorAll('svg')).some(svg => {
            const box = svg.getBoundingClientRect();
            return box.left < page.left - .5 || box.top < page.top - .5 || box.right > page.right + .5 || box.bottom > page.bottom + .5;
          });
        });
        return { height: document.body.getBoundingClientRect().height, clipped };
      })()`);
      if (measured.clipped) throw new Error("Barcode is clipped by the saved size or offsets. Adjust the sticker preset before printing.");
      if (kind === "receipt") {
        heightMm = Math.max(25, Math.ceil(measured.height * 25.4 / 96) + 3);
        if (heightMm > 3000) throw new Error("Receipt exceeds the printer's maximum page length");
      }
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Printer did not confirm submission. Check its queue before retrying to avoid duplicates.")), 60000);
        window.webContents.print({ silent: true, deviceName: printDeviceName, printBackground: true,
          landscape: false, scaleFactor: 100, copies: profile.copies,
          pageSize: { width: Math.round(widthMm * 1000), height: Math.round(heightMm * 1000) },
          margins: { marginType: "none" } }, (success, reason) => {
          clearTimeout(timeout);
          if (success) resolve(); else reject(new Error(reason || "Print submission failed"));
        });
      });
      return { ok: true };
    } finally {
      if (window && !window.isDestroyed()) window.destroy();
      active = false;
    }
  };
}
