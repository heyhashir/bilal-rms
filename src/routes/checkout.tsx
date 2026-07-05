import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCart } from "@/store/cart";
import { useAuth, useOrders, type Order } from "@/store/auth";
import { useCatalog } from "@/store/catalog";
import { formatPrice } from "@/lib/format";
import { site } from "@/config/site";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Bilal Garments" }] }),
  component: Checkout,
});

type Method = Order["payment"];

function Checkout() {
  const navigate = useNavigate();
  const { lines, subtotal, clear } = useCart();
  const auth = useAuth();
  const orders = useOrders();
  const decrement = useCatalog((s) => s.decrementStock);
  const user = auth.users.find((u) => u.id === auth.currentId) ?? null;

  const [confirmed, setConfirmed] = useState<Order | null>(null);

  const [form, setForm] = useState({
    email: user?.email ?? "",
    name: user?.name ?? "",
    address: "",
    city: "",
    postal: "",
    phone: "",
    payment: "cod" as Method,
    cardNumber: "",
    cardExp: "",
    cardCvc: "",
    mobileWallet: "",
  });

  const sub = subtotal();
  const ship = sub >= site.shipping.freeAbove ? 0 : site.shipping.flatRate;
  const total = sub + ship;

  if (confirmed) return <Confirmation order={confirmed} />;

  if (lines.length === 0) {
    return (
      <div className="container-bg py-24 text-center">
        <h1 className="display text-4xl mb-3">Nothing to checkout.</h1>
        <Link to="/shop" className="text-xs uppercase tracking-widest underline">Browse products</Link>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.payment === "card" && (!form.cardNumber || !form.cardExp || !form.cardCvc)) {
      return toast.error("Complete card details");
    }
    if ((form.payment === "jazzcash" || form.payment === "easypaisa") && !form.mobileWallet) {
      return toast.error("Enter mobile wallet number");
    }

    const order = orders.add({
      userId: user?.id ?? null,
      email: form.email,
      customerName: form.name,
      lines,
      shipping: { address: form.address, city: form.city, postal: form.postal, phone: form.phone },
      payment: form.payment,
      subtotal: sub,
      shippingFee: ship,
      total,
    });
    lines.forEach((l) => decrement(l.productId, l.qty));
    clear();
    setConfirmed(order);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  };

  const upd = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="container-bg py-12 md:py-16">
      <h1 className="display text-4xl md:text-5xl mb-10">Checkout.</h1>
      <form onSubmit={submit} className="grid lg:grid-cols-[1fr_380px] gap-12">
        <div className="space-y-10">
          <Section title="Contact">
            <div className="grid md:grid-cols-2 gap-3">
              <Input label="Email" type="email" value={form.email} onChange={(v) => upd("email", v)} />
              <Input label="Full name" value={form.name} onChange={(v) => upd("name", v)} />
            </div>
          </Section>

          <Section title="Shipping address">
            <div className="grid gap-3">
              <Input label="Address" value={form.address} onChange={(v) => upd("address", v)} />
              <div className="grid md:grid-cols-3 gap-3">
                <Input label="City" value={form.city} onChange={(v) => upd("city", v)} />
                <Input label="Postal code" value={form.postal} onChange={(v) => upd("postal", v)} />
                <Input label="Phone" value={form.phone} onChange={(v) => upd("phone", v)} />
              </div>
            </div>
          </Section>

          <Section title="Payment method">
            <div className="grid sm:grid-cols-2 gap-3">
              {([
                ["cod", "Cash on Delivery"],
                ["jazzcash", "JazzCash"],
                ["easypaisa", "EasyPaisa"],
                ["card", "Credit / Debit Card"],
              ] as [Method, string][]).map(([v, label]) => (
                <label
                  key={v}
                  className={`flex items-center gap-3 border p-4 cursor-pointer ${form.payment === v ? "border-foreground bg-secondary" : "border-border"}`}
                >
                  <input type="radio" name="pay" checked={form.payment === v} onChange={() => upd("payment", v)} />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              ))}
            </div>

            {form.payment === "card" && (
              <div className="mt-5 grid gap-3">
                <Input label="Card number" value={form.cardNumber} onChange={(v) => upd("cardNumber", v.replace(/[^0-9 ]/g, "").slice(0, 19))} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Expiry (MM/YY)" value={form.cardExp} onChange={(v) => upd("cardExp", v.slice(0, 5))} />
                  <Input label="CVC" value={form.cardCvc} onChange={(v) => upd("cardCvc", v.replace(/\D/g, "").slice(0, 4))} />
                </div>
              </div>
            )}
            {(form.payment === "jazzcash" || form.payment === "easypaisa") && (
              <div className="mt-5">
                <Input
                  label={`${form.payment === "jazzcash" ? "JazzCash" : "EasyPaisa"} mobile number`}
                  value={form.mobileWallet}
                  onChange={(v) => upd("mobileWallet", v.replace(/\D/g, "").slice(0, 11))}
                />
              </div>
            )}
            {form.payment === "cod" && (
              <p className="mt-4 text-sm text-muted-foreground">Pay with cash when your order arrives.</p>
            )}
          </Section>
        </div>

        <aside className="bg-secondary p-6 h-fit text-sm space-y-4 lg:sticky lg:top-24">
          <h2 className="display text-xl">Order summary</h2>
          <div className="space-y-3 max-h-72 overflow-auto pr-1">
            {lines.map((l) => (
              <div key={l.id} className="flex gap-3">
                <div className="w-14 aspect-[4/5] bg-background overflow-hidden shrink-0">
                  <img src={l.image} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm line-clamp-1">{l.name}</div>
                  <div className="text-xs text-muted-foreground">{l.color} · {l.size} · ×{l.qty}</div>
                </div>
                <div className="text-sm">{formatPrice(l.unitPrice * l.qty)}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 space-y-2">
            <Row label="Subtotal" value={formatPrice(sub)} />
            <Row label="Shipping" value={ship === 0 ? "Free" : formatPrice(ship)} />
            <div className="flex justify-between font-semibold text-base pt-2">
              <span>Total</span><span>{formatPrice(total)}</span>
            </div>
          </div>
          <button type="submit" className="w-full bg-primary text-primary-foreground py-4 text-xs uppercase tracking-[0.2em]">
            Place order
          </button>
          <button type="button" onClick={() => navigate({ to: "/cart" })} className="w-full text-xs uppercase tracking-widest text-muted-foreground">
            Back to cart
          </button>
        </aside>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="display text-2xl mb-4">{title}</h2>
      {children}
    </section>
  );
}
function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      <input
        required
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-border bg-background px-3 py-3 text-sm outline-none focus:border-foreground"
      />
    </label>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>;
}

function Confirmation({ order }: { order: Order }) {
  return (
    <div className="container-bg py-20 max-w-2xl">
      <div className="text-center">
        <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-foreground">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="display text-4xl md:text-5xl">Thank you!</h1>
        <p className="mt-3 text-muted-foreground">
          Order <span className="text-foreground font-semibold">{order.id}</span> placed successfully.
        </p>
      </div>
      <div className="mt-10 bg-secondary p-6 text-sm space-y-2">
        <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">{formatPrice(order.total)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="uppercase">{order.payment}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Ships to</span><span>{order.shipping.address}, {order.shipping.city}</span></div>
      </div>
      <div className="mt-8 flex gap-3 justify-center">
        <Link to="/account" className="bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-widest">View orders</Link>
        <Link to="/shop" className="border border-foreground px-6 py-3 text-xs uppercase tracking-widest">Keep shopping</Link>
      </div>
    </div>
  );
}
