import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { catalogApi } from "@/lib/catalog-api";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { orderApi } from "@/lib/order-api";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/account-types";
import { useCart } from "@/store/cart";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout - BALI by Bilal Garments EST 2001." }] }),
  component: Checkout,
});

type Method = Order["payment"];

function Checkout() {
  const navigate = useNavigate();
  const { lines, subtotal, clear } = useCart();
  const { data: user } = useCurrentUser();
  const { data } = useQuery({
    queryKey: queryKeys.catalog.bootstrap,
    queryFn: catalogApi.bootstrap,
  });
  const shippingZones = data?.shippingZones ?? [];
  const defaultAddress = user?.addresses.find((entry) => entry.isDefault) ?? user?.addresses[0] ?? null;
  const [confirmed, setConfirmed] = useState<Order | null>(null);
  const [proof, setProof] = useState<File | null>(null);

  const [form, setForm] = useState({
    email: user?.email ?? "",
    name: user?.name ?? "",
    address: defaultAddress?.line1 ?? "",
    address2: defaultAddress?.line2 ?? "",
    city: defaultAddress?.city ?? shippingZones.find((entry) => !entry.isUniversal)?.city ?? "",
    postal: defaultAddress?.postal ?? "",
    phone: defaultAddress?.phone ?? "",
    payment: "cod" as Method,
    walletReference: "",
    notes: "",
  });

  useEffect(() => {
    const firstSpecificZone = shippingZones.find((entry) => !entry.isUniversal);
    if (!form.city && firstSpecificZone) {
      setForm((current) => ({ ...current, city: firstSpecificZone.city }));
    }
  }, [form.city, shippingZones]);

  const zone = useMemo(() => {
    const normalizedCity = form.city.trim().toLowerCase();
    if (!normalizedCity) {
      return null;
    }

    const exactMatch = shippingZones.find(
      (entry) => !entry.isUniversal && entry.city.trim().toLowerCase() === normalizedCity,
    );

    return exactMatch ?? shippingZones.find((entry) => entry.isUniversal) ?? null;
  }, [form.city, shippingZones]);

  const sub = subtotal();
  const ship = zone ? (zone.freeAbove !== null && sub >= zone.freeAbove ? 0 : zone.fee) : 0;
  const total = sub + ship;

  if (confirmed) return <Confirmation order={confirmed} />;

  if (lines.length === 0) {
    return (
      <div className="container-bg py-24 text-center">
        <h1 className="display mb-3 text-4xl">Nothing to checkout.</h1>
        <Link to="/shop" className="text-xs uppercase tracking-widest underline">Browse products</Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.city.trim()) return toast.error("Enter your city");
    if (!zone) return toast.error("No shipping zone is configured");
    if (form.payment !== "cod" && !form.walletReference) return toast.error("Enter your payment reference");
    if (form.payment !== "cod" && !proof) return toast.error("Upload your payment screenshot");

    const payload = new FormData();
    payload.set("email", form.email);
    payload.set("customerName", form.name);
    payload.set("address", form.address);
    payload.set("address2", form.address2);
    payload.set("city", form.city.trim());
    payload.set("postal", form.postal);
    payload.set("phone", form.phone);
    payload.set("country", "Pakistan");
    payload.set("shippingZoneId", zone.id);
    payload.set("payment", form.payment);
    payload.set("walletReference", form.walletReference);
    payload.set("notes", form.notes);
    payload.set(
      "lines",
      JSON.stringify(
        lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId ?? null,
          qty: line.qty,
        })),
      ),
    );

    if (proof) {
      payload.set("paymentProof", proof);
    }

    try {
      const response = await orderApi.checkout(payload);
      const order = response.order;
      await queryClient.invalidateQueries({ queryKey: queryKeys.account.orders });
      clear();
      setConfirmed(order);
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to place order"));
    }
  };

  const upd = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="container-bg py-12 md:py-16">
      <h1 className="display mb-10 text-4xl md:text-5xl">Checkout.</h1>
      <form onSubmit={submit} className="grid gap-12 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          <Section title="Contact">
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Email" type="email" value={form.email} onChange={(v) => upd("email", v)} />
              <Input label="Full name" value={form.name} onChange={(v) => upd("name", v)} />
            </div>
          </Section>

          <Section title="Shipping address">
            <div className="grid gap-3">
              <Input label="Address" value={form.address} onChange={(v) => upd("address", v)} />
              <Input label="Address line 2" value={form.address2} onChange={(v) => upd("address2", v)} required={false} />
              <div className="grid gap-3 md:grid-cols-3">
                <Input label="City" value={form.city} onChange={(v) => upd("city", v)} listId="shipping-city-suggestions" />
                <datalist id="shipping-city-suggestions">
                  {shippingZones.filter((entry) => !entry.isUniversal).map((entry) => (
                    <option key={entry.id} value={entry.city} />
                  ))}
                </datalist>
                <Input label="Postal code" value={form.postal} onChange={(v) => upd("postal", v)} />
                <Input label="Phone" value={form.phone} onChange={(v) => upd("phone", v)} />
              </div>
              {zone && (
                <p className="text-sm text-muted-foreground">
                  Shipping via {zone.isUniversal ? "All cities fallback" : zone.label ?? zone.name}.
                </p>
              )}
            </div>
          </Section>

          <Section title="Payment method">
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ["cod", "Cash on Delivery"],
                ["jazzcash", "JazzCash"],
                ["easypaisa", "EasyPaisa"],
              ] as [Method, string][]).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-3 border p-4 ${form.payment === value ? "border-foreground bg-secondary" : "border-border"}`}
                >
                  <input type="radio" name="pay" checked={form.payment === value} onChange={() => upd("payment", value)} />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              ))}
            </div>

            {form.payment === "cod" ? (
              <p className="mt-4 text-sm text-muted-foreground">Pay with cash when your order arrives.</p>
            ) : (
              <div className="mt-5 grid gap-3">
                <Input label="Wallet transaction reference" value={form.walletReference} onChange={(v) => upd("walletReference", v)} />
                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">Payment screenshot</span>
                  <input
                    required
                    type="file"
                    accept="image/*"
                    onChange={(event) => setProof(event.target.files?.[0] ?? null)}
                    className="w-full border border-border bg-background px-3 py-3 text-sm outline-none focus:border-foreground"
                  />
                </label>
              </div>
            )}
          </Section>

          <Section title="Order notes">
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">Notes</span>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(event) => upd("notes", event.target.value)}
                className="w-full border border-border bg-background px-3 py-3 text-sm outline-none focus:border-foreground"
              />
            </label>
          </Section>
        </div>

        <aside className="h-fit space-y-4 bg-secondary p-6 text-sm lg:sticky lg:top-24">
          <h2 className="display text-xl">Order summary</h2>
          <div className="max-h-72 space-y-3 overflow-auto pr-1">
            {lines.map((line) => (
              <div key={line.id} className="flex gap-3">
                <div className="aspect-[4/5] w-14 shrink-0 overflow-hidden bg-background">
                  <img src={line.image} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-sm">{line.name}</div>
                  <div className="text-xs text-muted-foreground">{[line.color, line.size, `x${line.qty}`].filter(Boolean).join(" · ")}</div>
                </div>
                <div className="text-sm">{formatPrice(line.unitPrice * line.qty)}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2 border-t border-border pt-3">
            <Row label="Subtotal" value={formatPrice(sub)} />
            <Row label="Shipping" value={zone ? (ship === 0 ? "Free" : formatPrice(ship)) : "Enter city"} />
            <div className="flex justify-between pt-2 text-base font-semibold">
              <span>Total</span><span>{formatPrice(total)}</span>
            </div>
          </div>
          <button type="submit" className="w-full bg-primary py-4 text-xs uppercase tracking-[0.2em] text-primary-foreground">
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
      <h2 className="display mb-4 text-2xl">{title}</h2>
      {children}
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = true,
  listId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  listId?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        list={listId}
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
    <div className="container-bg max-w-2xl py-20">
      <div className="text-center">
        <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-foreground">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="display text-4xl md:text-5xl">Thank you!</h1>
        <p className="mt-3 text-muted-foreground">
          Order <span className="font-semibold text-foreground">{order.id}</span> placed successfully.
        </p>
      </div>
      <div className="mt-10 space-y-2 bg-secondary p-6 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">{formatPrice(order.total)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="uppercase">{order.payment}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Ships to</span><span>{order.shipping.address}, {order.shipping.city}</span></div>
      </div>
      <div className="mt-8 flex justify-center gap-3">
        <Link
          to="/invoice/$orderNumber"
          params={{ orderNumber: order.id }}
          search={{ token: order.token }}
          className="border border-foreground px-6 py-3 text-xs uppercase tracking-widest"
        >
          Print invoice
        </Link>
        <Link to="/track-order" className="bg-primary px-6 py-3 text-xs uppercase tracking-widest text-primary-foreground">Track order</Link>
        <Link to="/shop" className="border border-foreground px-6 py-3 text-xs uppercase tracking-widest">Keep shopping</Link>
      </div>
    </div>
  );
}
