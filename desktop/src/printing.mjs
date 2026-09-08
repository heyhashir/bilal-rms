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
    number(p.copies, 1, 100, "copies");
    if (!Number.isInteger(p.copies)) throw new Error("Copies must be a whole number");
    if (kind === "receipt") {
      number(p.rollWidthMm, 38, 210, "receipt width");
      number(p.paddingMm, 0, p.rollWidthMm / 4, "padding");
      number(p.feedOffsetMm, 0, 100, "feed offset");
    } else {
      number(p.widthMm, 20, 210, "label width");
      number(p.heightMm, 15, 300, "label height");
      number(p.offsetXmm, -10, 10, "horizontal offset");
      number(p.offsetYmm, -10, 10, "vertical offset");
      number(p.gapMm, 0, 20, "label gap");
      if (![0, 90, 180, 270].includes(p.orientation)) throw new Error("Invalid label orientation");
      if (!["standard", "compact", "branded"].includes(p.design)) throw new Error("Invalid sticker design");
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
      if (!(await listPrinters()).some(p => p.name === profile.printerName)) {
        throw new Error(`Saved printer "${profile.printerName}" is unavailable. Reconnect it or change the printer preset.`);
      }
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
      window.webContents.on("will-navigate", event => event.preventDefault());
      window.webContents.on("will-frame-navigate", event => event.preventDefault());
      await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
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
        heightMm = Math.max(25, Math.ceil(measured.height * 25.4 / 96) + 1);
        if (heightMm > 3000) throw new Error("Receipt exceeds the printer's maximum page length");
      }
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Printer did not confirm submission. Check its queue before retrying to avoid duplicates.")), 60000);
        window.webContents.print({ silent: true, deviceName: profile.printerName, printBackground: true,
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
