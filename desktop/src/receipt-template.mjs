const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const createReceiptHtml = ({ sale, settings }) => {
  const lines = sale.items
    .map(
      (item) => `
        <tr>
          <td>
            <div class="item-name">${escapeHtml(item.name || "Product")}</div>
            <div class="item-meta">${escapeHtml([item.size, item.color, item.employeeName].filter(Boolean).join(" | "))}</div>
          </td>
          <td class="qty">${escapeHtml(item.qty)}</td>
          <td class="amount">${escapeHtml(item.lineTotal.toFixed(2))}</td>
        </tr>
      `,
    )
    .join("");

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(sale.receipt?.receiptNumber ?? sale.saleNumber)}</title>
      <style>
        @page { size: 72mm auto; margin: 0; }
        body {
          font-family: "Segoe UI", Arial, sans-serif;
          box-sizing: border-box;
          width: 72mm;
          margin: 0;
          padding: 8px;
          color: #111;
          font-size: 11px;
        }
        .center { text-align: center; }
        .brand { font-size: 16px; font-weight: 700; letter-spacing: 0.12em; }
        .meta, .footer { white-space: pre-wrap; color: #444; font-size: 10px; }
        .section { margin-top: 10px; }
        table { width: 100%; border-collapse: collapse; }
        td { vertical-align: top; padding: 4px 0; }
        .qty, .amount { text-align: right; white-space: nowrap; }
        .item-name { font-weight: 600; }
        .item-meta { color: #666; font-size: 10px; margin-top: 2px; }
        .divider { border-top: 1px dashed #222; margin: 8px 0; }
        .total { display: flex; justify-content: space-between; font-weight: 700; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="center">
        <div class="brand">${escapeHtml(settings?.logoPrimaryText ?? settings?.name ?? "BALY")}</div>
        <div>${escapeHtml(settings?.logoSecondaryText ?? "")}</div>
        <div>${escapeHtml(settings?.logoTertiaryText ?? "")}</div>
        ${settings?.thermalHeader ? `<div class="meta">${escapeHtml(settings.thermalHeader)}</div>` : ""}
      </div>
      <div class="divider"></div>
      <div class="section">
        <div>Receipt: ${escapeHtml(sale.receipt?.receiptNumber ?? sale.saleNumber)}</div>
        <div>Customer: ${escapeHtml(sale.customerName || "Walk-in customer")}</div>
        <div>Payment: ${escapeHtml(sale.paymentMethod)}</div>
        <div>Date: ${escapeHtml(new Date(sale.createdAt).toLocaleString())}</div>
      </div>
      <div class="divider"></div>
      <table>
        <tbody>${lines}</tbody>
      </table>
      <div class="divider"></div>
      <div class="total">
        <span>Total</span>
        <span>Rs. ${escapeHtml(sale.total.toFixed(2))}</span>
      </div>
      ${settings?.thermalFooter ? `<div class="section center footer">${escapeHtml(settings.thermalFooter)}</div>` : ""}
    </body>
  </html>`;
};
