import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/store/cart";
import { formatPrice } from "@/lib/format";
import { site } from "@/config/site";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — Bilal Garments" }] }),
  component: CartPage,
});

function CartPage() {
  const { lines, setQty, remove, subtotal } = useCart();
  const sub = subtotal();
  const ship = lines.length === 0 ? 0 : sub >= site.shipping.freeAbove ? 0 : site.shipping.flatRate;
  const total = sub + ship;

  if (lines.length === 0) {
    return (
      <div className="container-bg py-24 text-center">
        <h1 className="display text-5xl mb-4">Your bag is empty.</h1>
        <p className="text-muted-foreground mb-8">Let's find something you'll love.</p>
        <Link to="/shop" className="inline-block bg-primary text-primary-foreground px-8 py-4 text-xs uppercase tracking-[0.2em]">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container-bg py-12 md:py-16">
      <h1 className="display text-4xl md:text-5xl mb-10">Your bag.</h1>
      <div className="grid lg:grid-cols-[1fr_360px] gap-12">
        <div>
          {lines.map((l) => (
            <div key={l.id} className="flex gap-4 border-b border-border py-5">
              <div className="w-24 aspect-[4/5] bg-secondary overflow-hidden shrink-0">
                <img src={l.image} alt={l.name} className="h-full w-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-4">
                  <div>
                    <h3 className="font-medium">{l.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{l.color} · {l.size}</p>
                  </div>
                  <button onClick={() => remove(l.id)} className="text-muted-foreground hover:text-sale" aria-label="Remove">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center border border-border">
                    <button onClick={() => setQty(l.id, l.qty - 1)} className="px-2 py-1.5"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-8 text-center text-sm">{l.qty}</span>
                    <button onClick={() => setQty(l.id, l.qty + 1)} className="px-2 py-1.5"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="font-semibold">{formatPrice(l.unitPrice * l.qty)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="bg-secondary p-6 h-fit space-y-4 text-sm">
          <h2 className="display text-xl mb-2">Order summary</h2>
          <Row label="Subtotal" value={formatPrice(sub)} />
          <Row label="Shipping" value={ship === 0 ? "Free" : formatPrice(ship)} />
          <div className="border-t border-border pt-3 flex justify-between font-semibold text-base">
            <span>Total</span><span>{formatPrice(total)}</span>
          </div>
          <Link
            to="/checkout"
            className="block text-center bg-primary text-primary-foreground py-4 text-xs uppercase tracking-[0.2em] mt-2"
          >
            Checkout
          </Link>
          <Link to="/shop" className="block text-center text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>;
}
