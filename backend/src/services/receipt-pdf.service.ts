import bwipjs from 'bwip-js';
import PDFDocument from 'pdfkit';
import type { StoreSetting } from '@prisma/client';
import type { posService } from './pos.service';

type PosSale = Awaited<ReturnType<typeof posService.getSale>>;
type Snapshot = {
  store?: {
    name?: string;
    address?: string;
    phone?: string;
    taxNumber?: string;
    currencySymbol?: string;
  };
  receipt?: {
    thankYou?: string;
    guaranteePolicy?: string;
    exchangePolicy?: string;
    returnPolicy?: string;
    saleItemPolicy?: string;
    notes?: string;
    footer?: string;
  };
};

const money = (value: unknown) =>
  Number(value ?? 0).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const buildPosReceiptPdf = async (sale: PosSale, settings: StoreSetting): Promise<Buffer> => {
  if (!sale.receipt) {
    throw new Error('A finalized receipt is required to generate a PDF');
  }

  const snapshot = (sale.receipt.documentSnapshot ?? {}) as Snapshot;
  const store = snapshot.store ?? {};
  const policy = snapshot.receipt ?? {};
  const receiptId = sale.receipt.receiptNumber;
  const currency = store.currencySymbol || settings.currencySymbol || 'Rs.';
  const retailSubtotal =
    Number(sale.retailSubtotal) ||
    sale.items.reduce(
      (sum, item) => sum + Number(item.retailPrice || item.unitPrice) * item.qty,
      0,
    );
  const policies = [
    policy.guaranteePolicy || settings.guaranteePolicy,
    policy.exchangePolicy || settings.exchangePolicy,
    policy.returnPolicy || settings.returnPolicy,
    policy.notes || settings.receiptNotes,
    policy.saleItemPolicy || settings.saleItemPolicy,
    policy.footer || settings.thermalFooter,
  ].filter(Boolean);
  const pageHeight = Math.max(520, 360 + sale.items.length * 30 + policies.length * 26);
  const doc = new PDFDocument({
    size: [226.77, pageHeight],
    margins: { top: 12, right: 12, bottom: 12, left: 12 },
    info: {
      Title: `Receipt ${sale.receipt.invoiceNumber}`,
      Author: store.name || settings.storeName,
    },
  });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const complete = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const divider = () => {
    doc.moveTo(doc.page.margins.left, doc.y + 3).lineTo(doc.page.width - doc.page.margins.right, doc.y + 3).dash(2, { space: 2 }).stroke();
    doc.undash().moveDown(0.8);
  };
  const row = (label: string, value: string, bold = false) => {
    const y = doc.y;
    doc.font('Helvetica').fontSize(7).text(label, doc.page.margins.left, y, { width: 58 });
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').text(`: ${value}`, doc.page.margins.left + 58, y, { width: width - 58 });
    const valueHeight = doc.heightOfString(`: ${value}`, { width: width - 58 });
    doc.y = y + Math.max(10, valueHeight + 2);
  };

  doc.font('Helvetica-Bold').fontSize(15).text(store.name || settings.storeName, { align: 'center' });
  doc.font('Helvetica').fontSize(8).text(store.address || settings.address, { align: 'center' });
  doc.text(store.phone || settings.phone, { align: 'center' });
  if (store.taxNumber || settings.taxNumber) {
    doc.text(`Tax No: ${store.taxNumber || settings.taxNumber}`, { align: 'center' });
  }
  divider();

  const createdAt = sale.finalizedAt || sale.createdAt;
  row('Invoice No', sale.receipt.invoiceNumber, true);
  row('Receipt ID', receiptId, true);
  row('Date / Time', createdAt.toLocaleString('en-PK'));
  row('Associate', sale.items.map((item) => item.employee?.name).find(Boolean) || 'Admin');
  row('Payment', sale.paymentMethod || 'Unknown');
  row('Customer', sale.customerName || 'Walk-in Customer');
  row('Status', sale.status);
  divider();

  const columns = [72, 16, 35, 37, 42];
  const headers = ['Item', 'Qty', 'Retail', 'Charged', 'Subtotal'];
  let x = doc.page.margins.left;
  const headerY = doc.y;
  doc.rect(x, headerY, width, 14).fill('#000000');
  headers.forEach((header, index) => {
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(6).text(header, x + 2, headerY + 4, {
      width: columns[index] - 4,
      align: index === 0 ? 'left' : 'right',
    });
    x += columns[index];
  });
  doc.fillColor('#000000');
  doc.y = headerY + 18;

  sale.items.forEach((item) => {
    x = doc.page.margins.left;
    const y = doc.y;
    const values = [
      `${item.name}${item.size || item.colorName ? `\n${[item.size, item.colorName].filter(Boolean).join(' / ')}` : ''}`,
      String(item.qty),
      money(item.retailPrice || item.unitPrice),
      money(item.unitPrice),
      money(item.lineTotal),
    ];
    values.forEach((value, index) => {
      doc.font(index === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(6).text(value, x + 2, y, {
        width: columns[index] - 4,
        align: index === 0 ? 'left' : 'right',
      });
      x += columns[index];
    });
    doc.y = y + Math.max(20, doc.heightOfString(values[0], { width: columns[0] - 4 }) + 6);
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).dash(2, { space: 2 }).stroke().undash();
    doc.moveDown(0.4);
  });

  doc.font('Helvetica-Bold').fontSize(8).text(
    `Total Items: ${sale.items.reduce((sum, item) => sum + item.qty, 0)}`,
    doc.page.margins.left,
    doc.y,
    { width, align: 'center' },
  );
  divider();
  row('Retail subtotal', `${currency} ${money(retailSubtotal)}`);
  row('Discount', `${currency} ${money(sale.discountTotal)}`);
  row('Grand Total', `${currency} ${money(sale.total)}`, true);
  row('Cash Received', `${currency} ${money(sale.paidAmount)}`);
  row('Change Returned', `${currency} ${money(sale.changeAmount)}`);

  if (sale.status === 'VOID') {
    divider();
    doc.font('Helvetica-Bold').fontSize(14).text(`VOID\n${sale.voidReason || ''}`, { align: 'center' });
  }

  divider();
  const barcode = await bwipjs.toBuffer({
    bcid: 'code128',
    text: receiptId,
    scale: 2,
    height: 10,
    includetext: false,
    paddingwidth: 3,
    paddingheight: 0,
  });
  const barcodeY = doc.y;
  doc.image(barcode, doc.page.margins.left + 20, barcodeY, { fit: [width - 40, 42], align: 'center' });
  doc.y = barcodeY + 45;
  doc.font('Helvetica-Bold').fontSize(8).text(receiptId, doc.page.margins.left, doc.y, { width, align: 'center' });
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(9).text(policy.thankYou || settings.receiptThankYou, doc.page.margins.left, doc.y, { width, align: 'center' });
  doc.font('Helvetica').fontSize(6.5);
  policies.forEach((value) => doc.text(value, doc.page.margins.left, doc.y, { width, align: 'center' }));
  doc.end();

  return complete;
};
