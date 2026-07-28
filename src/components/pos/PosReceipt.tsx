import type { PosSale } from "@/lib/admin-types";
import type { StorefrontSettings } from "@/lib/catalog-types";
import { Barcode } from "@/components/pos/Barcode";

const money = (value: number) =>
  new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export function PosReceipt({
  sale,
  settings,
}: {
  sale: PosSale;
  settings: StorefrontSettings | null;
}) {
  const snapshot = sale.receipt?.documentSnapshot;
  const store = snapshot?.store;
  const policy = snapshot?.receipt;
  const createdAt = new Date(sale.finalizedAt ?? sale.createdAt);
  const totalItems = sale.items.reduce((sum, item) => sum + item.qty, 0);
  const currency = store?.currencySymbol || settings?.currencySymbol || "Rs.";

  return (
    <article className="pos-receipt mx-auto w-full max-w-[80mm] bg-white p-[4mm] text-black">
      <header className="text-center">
        {store?.logoPath && <img src={store.logoPath} alt="" className="mx-auto mb-2 max-h-12 max-w-32 object-contain" />}
        <h1 className="text-[17px] font-black leading-tight">
          {store?.name || settings?.name || "BALY by Bilal Garments EST 2001"}
        </h1>
        <div className="mx-auto my-2 h-px w-full bg-black" />
        <p className="text-[11px]">{store?.address || settings?.address}</p>
        <p className="text-[11px]">{store?.phone || settings?.phone}</p>
        {(store?.taxNumber || settings?.taxNumber) && (
          <p className="text-[10px]">Tax No: {store?.taxNumber || settings?.taxNumber}</p>
        )}
      </header>

      <section className="my-3 grid grid-cols-2 gap-x-4 border-y border-dashed border-black py-2 text-[10px]">
        <div className="space-y-1">
          <ReceiptMeta label="Invoice No" value={sale.receipt?.invoiceNumber || "-"} strong />
          <ReceiptMeta label="Receipt ID" value={sale.receipt?.receiptNumber || sale.saleNumber} strong />
          <ReceiptMeta label="Date" value={createdAt.toLocaleDateString("en-GB")} />
          <ReceiptMeta label="Time" value={createdAt.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })} />
        </div>
        <div className="space-y-1">
          <ReceiptMeta label="Associate" value={sale.items.map((item) => item.employeeName).find(Boolean) || "Admin"} />
          <ReceiptMeta label="Payment" value={sale.paymentMethod.toUpperCase()} />
          <ReceiptMeta label="Customer" value={sale.customerName || "Walk-in Customer"} />
          <ReceiptMeta label="Status" value={sale.status.toUpperCase()} />
        </div>
      </section>

      <table className="w-full table-fixed text-[8px]">
        <thead className="bg-black text-white">
          <tr>
            <th className="w-[33%] px-1 py-1.5 text-left">Item</th>
            <th className="w-[9%] px-1 py-1.5 text-right">Qty</th>
            <th className="w-[19%] px-1 py-1.5 text-right">Retail</th>
            <th className="w-[20%] px-1 py-1.5 text-right">Charged</th>
            <th className="w-[19%] px-1 py-1.5 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item) => (
            <tr key={item.id} className="border-b border-dashed border-black">
              <td className="px-1 py-2 align-top">
                <strong>{item.name}</strong>
                {(item.size || item.color) && (
                  <div className="mt-0.5 text-[7px]">{[item.size, item.color].filter(Boolean).join(" / ")}</div>
                )}
              </td>
              <td className="px-1 py-2 text-right align-top">{item.qty}</td>
              <td className="px-1 py-2 text-right align-top">{money(item.retailPrice || item.unitPrice)}</td>
              <td className="px-1 py-2 text-right align-top">{money(item.unitPrice)}</td>
              <td className="px-1 py-2 text-right align-top">{money(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-b border-dashed border-black py-2 text-center text-[11px] font-bold">
        Total Items: {totalItems}
      </div>

      <section className="ml-auto mt-2 w-[70%] space-y-1 text-[10px]">
        <ReceiptTotal label="Retail subtotal" value={`${currency} ${money(sale.retailSubtotal || sale.subtotal)}`} />
        <ReceiptTotal label="Discount" value={`${currency} ${money(sale.discountTotal)}`} />
        <ReceiptTotal label="Grand Total" value={`${currency} ${money(sale.total)}`} strong />
        <ReceiptTotal label="Cash Received" value={`${currency} ${money(sale.paidAmount)}`} />
        <ReceiptTotal label="Change Returned" value={`${currency} ${money(sale.changeAmount)}`} />
      </section>

      {sale.status === "void" && (
        <section className="my-3 border-2 border-black p-2 text-center text-sm font-black uppercase">
          Voided
          <div className="mt-1 text-[9px] font-normal normal-case">{sale.voidReason}</div>
        </section>
      )}

      <section className="my-3 border-y border-dashed border-black py-3 text-center">
        <Barcode
          value={sale.receipt?.receiptNumber || sale.saleNumber}
          height={11}
          className="mx-auto max-w-full"
        />
        <div className="mt-1 text-[11px] font-bold tracking-wide">
          {sale.receipt?.receiptNumber || sale.saleNumber}
        </div>
      </section>

      <footer className="space-y-1 text-center text-[9px]">
        <p className="text-[12px] font-black">{policy?.thankYou || settings?.receiptThankYou}</p>
        {policy?.guaranteePolicy || settings?.guaranteePolicy ? (
          <p>{policy?.guaranteePolicy || settings?.guaranteePolicy}</p>
        ) : null}
        {policy?.exchangePolicy || settings?.exchangePolicy ? (
          <p>{policy?.exchangePolicy || settings?.exchangePolicy}</p>
        ) : null}
        {policy?.returnPolicy || settings?.returnPolicy ? (
          <p>{policy?.returnPolicy || settings?.returnPolicy}</p>
        ) : null}
        {policy?.notes || settings?.receiptNotes ? <p>{policy?.notes || settings?.receiptNotes}</p> : null}
        {policy?.saleItemPolicy || settings?.saleItemPolicy ? (
          <p className="pt-1 text-[11px] font-black">{policy?.saleItemPolicy || settings?.saleItemPolicy}</p>
        ) : null}
        {policy?.footer || settings?.thermalFooter ? (
          <p className="whitespace-pre-line pt-1">{policy?.footer || settings?.thermalFooter}</p>
        ) : null}
      </footer>
    </article>
  );
}

function ReceiptMeta({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[68px_1fr] gap-1">
      <span>{label}</span>
      <span className={strong ? "font-bold" : ""}>: {value}</span>
    </div>
  );
}

function ReceiptTotal({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "border-y border-dashed border-black py-1 text-[13px] font-black" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
