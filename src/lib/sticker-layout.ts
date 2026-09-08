// Shared by the on-screen preview and the standalone browser/Electron print document.
export const STICKER_CSS = `
  .barcode-sticker {
    box-sizing: border-box; width: 100%; height: 100%; padding: 0.8mm 1.2mm 2.2mm 1.2mm;
    display: flex; flex-direction: column; justify-content: space-between;
    background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif;
    text-align: center; overflow: hidden;
  }
  .barcode-sticker * { box-sizing: border-box; }
  .sticker-standard-header { font-size: 7pt; font-weight: 900; line-height: 1; letter-spacing: 0.02em; }
  .sticker-standard-title, .sticker-title { font-size: 5.5pt; font-weight: 800; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; }
  .sticker-standard-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 5.5pt; font-weight: 700; line-height: 1.1; text-transform: uppercase; }
  .sticker-standard-price { font-size: 6.5pt; line-height: 1.1; font-weight: 900; }
  .sticker-compact-meta { display: flex; justify-content: space-between; font-size: 5.5pt; font-weight: 700; line-height: 1.1; text-transform: uppercase; }
  .sticker-compact-price { font-size: 7.5pt; font-weight: 900; line-height: 1.1; }
  .sticker-barcode-wrap { flex-shrink: 0; text-align: center; }
  .sticker-barcode-value { font: bold 5.5pt/1 'Courier New', monospace; margin-top: .4mm; white-space: nowrap; letter-spacing: 0.04em; }
  .sticker-branded-top { display: flex; gap: 1mm; min-height: 0; }
  .sticker-brand-panel { width: 30%; flex-shrink: 0; background: #0b3158; color: #ddb34d; display: flex; flex-direction: column; justify-content: center; }
  .sticker-brand-name { font-size: 9.5pt; font-weight: 900; line-height: 1; }
  .sticker-brand-subtitle, .sticker-brand-est { font-size: 3.5pt; line-height: 1.3; }
  .sticker-content { flex: 1; min-width: 0; text-align: left; }
  .sticker-details { display: grid; grid-template-columns: auto auto minmax(0,1fr); gap: 0 .5mm; font-size: 5pt; line-height: 1.15; }
  .sticker-details strong { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sticker-unsafe { color: #b91c1c; font-size: 6pt; line-height: 1.2; border: 1px solid; padding: 1mm; }
`;
