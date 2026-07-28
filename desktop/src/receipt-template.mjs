import bwipjs from "bwip-js";

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const money = (value) =>
  Number(value ?? 0).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const meta = (label, value, strong = false) =>
  `<div class="meta-row"><span>${escapeHtml(label)}</span><span class="${strong ? "strong" : ""}">: ${escapeHtml(value)}</span></div>`;

const barcodeSvg = (value) => {
  try {
    return bwipjs.toSVG({
      bcid: "code128",
      text: String(value),
      scale: 2,
      height: 11,
      includetext: false,
      paddingwidth: 3,
      paddingheight: 0,
      backgroundcolor: "FFFFFF",
    });
  } catch {
    return "";
  }
};

export const createReceiptHtml = ({ sale, settings }) => {
  const snapshot = sale.receipt?.documentSnapshot ?? {};
  const store = snapshot.store ?? {};
  const policy = snapshot.receipt ?? {};
  const receiptId = sale.receipt?.receiptNumber ?? sale.saleNumber;
  const createdAt = new Date(sale.finalizedAt ?? sale.createdAt ?? Date.now());
  const currency = store.currencySymbol || settings?.currencySymbol || "Rs.";
  const totalItems = sale.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const retailSubtotal =
    sale.retailSubtotal ||
    sale.items.reduce(
      (sum, item) => sum + Number(item.retailPrice || item.unitPrice || 0) * Number(item.qty || 0),
      0,
    );
  const discountTotal = sale.discountTotal ?? Math.max(0, retailSubtotal - Number(sale.subtotal || sale.total || 0));

  const lines = sale.items
    .map(
      (item) => `
        <tr>
          <td>
            <div class="item-name">${escapeHtml(item.name || "Product")}</div>
            <div class="item-meta">${escapeHtml([item.size, item.color].filter(Boolean).join(" / "))}</div>
          </td>
          <td class="number">${escapeHtml(item.qty)}</td>
          <td class="number">${escapeHtml(money(item.retailPrice || item.unitPrice))}</td>
          <td class="number">${escapeHtml(money(item.unitPrice))}</td>
          <td class="number">${escapeHtml(money(item.lineTotal))}</td>
        </tr>
      `,
    )
    .join("");

  const policies = [
    policy.guaranteePolicy || settings?.guaranteePolicy,
    policy.exchangePolicy || settings?.exchangePolicy,
    policy.returnPolicy || settings?.returnPolicy,
    policy.notes || settings?.receiptNotes,
  ]
    .filter(Boolean)
    .map((value) => `<div>${escapeHtml(value)}</div>`)
    .join("");

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(receiptId)}</title>
      <style>
        @page { size: 72mm auto; margin: 0; }
        * { box-sizing: border-box; }
        body {
          font-family: "Arial Narrow", "Segoe UI", Arial, sans-serif;
          width: 72mm;
          margin: 0;
          padding: 3mm;
          color: #000;
          background: #fff;
          font-size: 9px;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        .center { text-align: center; }
        .brand { font-size: 17px; font-weight: 900; line-height: 1.05; }
        .contact { margin-top: 4px; font-size: 10px; line-height: 1.4; }
        .divider { border-top: 1px dashed #000; margin: 7px 0; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .meta-row { display: grid; grid-template-columns: 54px 1fr; gap: 2px; margin: 2px 0; }
        .strong { font-weight: 800; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th { background: #000; color: #fff; padding: 4px 2px; font-size: 7px; }
        th:first-child { width: 33%; text-align: left; }
        th:nth-child(2) { width: 9%; }
        th:nth-child(3) { width: 19%; }
        th:nth-child(4) { width: 20%; }
        th:nth-child(5) { width: 19%; }
        td { vertical-align: top; padding: 5px 2px; border-bottom: 1px dashed #000; font-size: 7px; }
        .number { text-align: right; white-space: nowrap; }
        .item-name { font-weight: 700; }
        .item-meta { font-size: 6.5px; margin-top: 2px; }
        .item-count { padding: 6px 0; border-bottom: 1px dashed #000; text-align: center; font-size: 10px; font-weight: 800; }
        .totals { width: 70%; margin: 6px 0 0 auto; }
        .total-row { display: flex; justify-content: space-between; gap: 8px; margin: 3px 0; }
        .grand { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; font-size: 12px; font-weight: 900; }
        .barcode { padding: 8px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; text-align: center; }
        .barcode svg { display: block; max-width: 100%; height: auto; margin: 0 auto; }
        .barcode-text { margin-top: 3px; font-size: 11px; font-weight: 800; letter-spacing: .05em; }
        .footer { margin-top: 7px; text-align: center; font-size: 8px; line-height: 1.4; }
        .thank-you { font-size: 11px; font-weight: 900; }
        .sale-policy { margin-top: 4px; font-size: 10px; font-weight: 900; }
        .void { margin: 7px 0; border: 2px solid #000; padding: 5px; text-align: center; font-size: 14px; font-weight: 900; }
      </style>
    </head>
    <body>
      <header class="center">
        <div class="brand">${escapeHtml(store.name || settings?.name || "BALY by Bilal Garments EST 2001")}</div>
        <div class="contact">
          <div>${escapeHtml(store.address || settings?.address || "")}</div>
          <div>${escapeHtml(store.phone || settings?.phone || "")}</div>
          ${store.taxNumber || settings?.taxNumber ? `<div>Tax No: ${escapeHtml(store.taxNumber || settings?.taxNumber)}</div>` : ""}
        </div>
      </header>
      <div class="divider"></div>
      <section class="meta-grid">
        <div>
          ${meta("Invoice No", sale.receipt?.invoiceNumber || "-", true)}
          ${meta("Receipt ID", receiptId, true)}
          ${meta("Date", createdAt.toLocaleDateString("en-GB"))}
          ${meta("Time", createdAt.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }))}
        </div>
        <div>
          ${meta("Associate", sale.items.map((item) => item.employeeName).find(Boolean) || "Admin")}
          ${meta("Payment", String(sale.paymentMethod || "").toUpperCase())}
          ${meta("Customer", sale.customerName || "Walk-in Customer")}
          ${meta("Status", String(sale.status || "").toUpperCase())}
        </div>
      </section>
      <div class="divider"></div>
      <table>
        <thead>
          <tr><th>Item</th><th>Qty</th><th>Retail</th><th>Charged</th><th>Subtotal</th></tr>
        </thead>
        <tbody>${lines}</tbody>
      </table>
      <div class="item-count">Total Items: ${totalItems}</div>
      <section class="totals">
        <div class="total-row"><span>Retail subtotal</span><span>${escapeHtml(currency)} ${money(retailSubtotal)}</span></div>
        <div class="total-row"><span>Discount</span><span>${escapeHtml(currency)} ${money(discountTotal)}</span></div>
        <div class="total-row grand"><span>Grand Total</span><span>${escapeHtml(currency)} ${money(sale.total)}</span></div>
        <div class="total-row"><span>Cash Received</span><span>${escapeHtml(currency)} ${money(sale.paidAmount)}</span></div>
        <div class="total-row"><span>Change Returned</span><span>${escapeHtml(currency)} ${money(sale.changeAmount)}</span></div>
      </section>
      ${sale.status === "void" ? `<div class="void">VOID<div>${escapeHtml(sale.voidReason || "")}</div></div>` : ""}
      <section class="barcode">
        ${barcodeSvg(receiptId)}
        <div class="barcode-text">${escapeHtml(receiptId)}</div>
      </section>
      <footer class="footer">
        <div class="thank-you">${escapeHtml(policy.thankYou || settings?.receiptThankYou || "Thank you for shopping with us!")}</div>
        ${policies}
        ${policy.saleItemPolicy || settings?.saleItemPolicy ? `<div class="sale-policy">${escapeHtml(policy.saleItemPolicy || settings?.saleItemPolicy)}</div>` : ""}
        ${policy.footer || settings?.thermalFooter ? `<div>${escapeHtml(policy.footer || settings?.thermalFooter)}</div>` : ""}
      </footer>
    </body>
  </html>`;
};
