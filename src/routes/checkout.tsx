import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ShieldCheck,
  Truck,
  Lock,
  ShoppingBag,
  HelpCircle,
  ArrowLeft,
  Tag,
  X,
  CreditCard,
  Banknote,
  Building2,
  Globe,
  Info,
} from "lucide-react";
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
import { useExchangeRate } from "@/lib/currency";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout - BALY by Bilal Garments EST 2001." }] }),
  component: Checkout,
});

type Method = Order["payment"];

const COUNTRIES = [
  { code: "PK", name: "Pakistan", flag: "🇵🇰", currency: "PKR" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", currency: "PKR" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", currency: "PKR" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", currency: "PKR" },
  { code: "US", name: "United States", flag: "🇺🇸", currency: "PKR" },
  { code: "CA", name: "Canada", flag: "🇨🇦", currency: "PKR" },
  { code: "AU", name: "Australia", flag: "🇦🇺", currency: "PKR" },
  { code: "OM", name: "Oman", flag: "🇴🇲", currency: "PKR" },
  { code: "QA", name: "Qatar", flag: "🇶🇦", currency: "PKR" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼", currency: "PKR" },
  { code: "BH", name: "Bahrain", flag: "🇧🇭", currency: "PKR" },
  { code: "EU", name: "European Union", flag: "🇪🇺", currency: "PKR" },
  { code: "INTL", name: "Other International", flag: "🌐", currency: "PKR" },
];

const PROMO_CODES: Record<string, { percent?: number; amount?: number; label: string }> = {
  WELCOME10: { percent: 10, label: "10% off welcome discount" },
  BALY10: { percent: 10, label: "10% off promo" },
  SAVE500: { amount: 500, label: "Rs. 500 off orders" },
};

function Checkout() {
  const navigate = useNavigate();
  const { lines, buyNowLine, clear, clearBuyNow } = useCart();
  const { formatUsdShort, pkrPerUsd, source: exchangeRateSource } = useExchangeRate();
  const checkoutLines = buyNowLine ? [buyNowLine] : lines;
  const { data: user } = useCurrentUser();
  const { data } = useQuery({
    queryKey: queryKeys.catalog.bootstrap,
    queryFn: catalogApi.bootstrap,
  });

  const shippingZones = useMemo(() => data?.shippingZones ?? [], [data?.shippingZones]);
  const defaultAddress = user?.addresses.find((entry) => entry.isDefault) ?? user?.addresses[0] ?? null;
  const [confirmed, setConfirmed] = useState<Order | null>(null);
  const [proof, setProof] = useState<File | null>(null);
  const [checkoutKey] = useState(() => crypto.randomUUID());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Discount code state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; percent?: number; amount?: number; label: string } | null>(null);

  // Form State matching Zellbury
  const [form, setForm] = useState({
    email: user?.email ?? "",
    emailOffers: true,
    country: "Pakistan",
    firstName: user?.name ? user.name.split(" ")[0] : "",
    lastName: user?.name ? user.name.split(" ").slice(1).join(" ") : "",
    address: defaultAddress?.line1 ?? "",
    address2: defaultAddress?.line2 ?? "",
    city: defaultAddress?.city ?? shippingZones.find((entry) => !entry.isUniversal)?.city ?? "",
    postal: defaultAddress?.postal ?? "",
    phone: defaultAddress?.phone ?? "",
    saveInfo: false,
    shippingMethod: "standard" as "standard" | "free_online" | "international",
    payment: "cod" as Method,
    billingSame: true,
    billingFirstName: "",
    billingLastName: "",
    billingAddress: "",
    billingCity: "",
    billingPostal: "",
    billingCountry: "Pakistan",
    walletReference: "",
    notes: "",
    cardNumber: "",
    cardExp: "",
    cardCvc: "",
    cardName: "",
  });

  const isInternational = form.country !== "Pakistan";

  // When switching country, automatically adjust payment and shipping method
  useEffect(() => {
    if (isInternational) {
      if (form.payment === "cod") {
        setForm((prev) => ({ ...prev, payment: "card", shippingMethod: "international" }));
      } else {
        setForm((prev) => ({ ...prev, shippingMethod: "international" }));
      }
    } else {
      if (form.shippingMethod === "international") {
        setForm((prev) => ({ ...prev, shippingMethod: "standard" }));
      }
    }
  }, [isInternational, form.payment, form.shippingMethod]);

  useEffect(() => {
    const firstSpecificZone = shippingZones.find((entry) => !entry.isUniversal);
    if (!form.city && firstSpecificZone && !isInternational) {
      setForm((current) => ({ ...current, city: firstSpecificZone.city }));
    }
  }, [form.city, shippingZones, isInternational]);

  const zone = useMemo(() => {
    if (isInternational) return null;
    const normalizedCity = form.city.trim().toLowerCase();
    if (!normalizedCity) return null;
    const exactMatch = shippingZones.find((entry) => !entry.isUniversal && entry.city.trim().toLowerCase() === normalizedCity);
    return exactMatch ?? shippingZones.find((entry) => entry.isUniversal) ?? null;
  }, [form.city, shippingZones, isInternational]);

  // Calculations
  const rawSubtotal = checkoutLines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.percent) {
      return Math.round((rawSubtotal * appliedCoupon.percent) / 100);
    }
    if (appliedCoupon.amount) {
      return Math.min(rawSubtotal, appliedCoupon.amount);
    }
    return 0;
  }, [appliedCoupon, rawSubtotal]);

  const subtotal = Math.max(0, rawSubtotal - discountAmount);

  // Shipping Fee
  const shippingFee = useMemo(() => {
    if (isInternational) {
      return 3500; // Rs. 3,500 Express International Delivery
    }
    if (form.shippingMethod === "free_online" || (form.payment !== "cod" && subtotal >= 3000)) {
      return 0;
    }
    if (zone) {
      return zone.freeAbove !== null && subtotal >= zone.freeAbove ? 0 : zone.fee;
    }
    return 250;
  }, [isInternational, form.shippingMethod, form.payment, subtotal, zone]);

  // COD Handling Charges (Rs. 50 as per Zellbury reference)
  const codFee = form.payment === "cod" && !isInternational ? 50 : 0;

  const total = subtotal + shippingFee + codFee;
  const estimatedTax = Math.round((total * 0.15) / 1.15); // Inclusive tax estimate

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = couponInput.trim().toUpperCase();
    if (!clean) return;
    if (PROMO_CODES[clean]) {
      setAppliedCoupon({ code: clean, ...PROMO_CODES[clean] });
      toast.success(`Coupon "${clean}" applied successfully!`);
      setCouponInput("");
    } else {
      toast.error("Invalid or expired coupon code. Try WELCOME10 or SAVE500");
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    toast.info("Coupon removed");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const fullName = `${form.firstName} ${form.lastName}`.trim() || user?.name || "Customer";

    if (!form.email.trim()) return toast.error("Enter your email address");
    if (!form.address.trim()) return toast.error("Enter your delivery address");
    if (!form.city.trim()) return toast.error("Enter your city");
    if (!form.phone.trim()) return toast.error("Enter your contact phone number");

    // International rules: COD is prohibited
    if (isInternational && form.payment === "cod") {
      return toast.error("Cash on Delivery is only available in Pakistan. Please select an online payment method for international orders.");
    }

    if (form.payment === "jazzcash" || form.payment === "easypaisa" || form.payment === "bank_transfer") {
      if (!form.walletReference && !proof) {
        return toast.error("Please enter a transaction reference ID or upload payment receipt proof");
      }
    }

    const payload = new FormData();
    payload.set("email", form.email.trim().toLowerCase());
    payload.set("customerName", fullName);
    payload.set("address", form.address);
    payload.set("address2", form.address2);
    payload.set("city", form.city.trim());
    payload.set("postal", form.postal.trim() || "00000");
    payload.set("phone", form.phone.trim());
    payload.set("country", form.country);
    payload.set("shippingZoneId", zone?.id ?? "international-zone");
    payload.set("payment", form.payment);
    payload.set("walletReference", form.walletReference || form.cardName || "");
    payload.set(
      "notes",
      [
        form.notes,
        appliedCoupon ? `Coupon: ${appliedCoupon.code} (-Rs. ${discountAmount})` : null,
        isInternational ? `[INTERNATIONAL ORDER - ${form.country.toUpperCase()}]` : null,
      ]
        .filter(Boolean)
        .join(" | "),
    );
    payload.set("checkoutKey", checkoutKey);
    payload.set(
      "lines",
      JSON.stringify(
        checkoutLines.map((line) => ({
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
      setIsSubmitting(true);
      const response = await orderApi.checkout(payload);
      const order = response.order;
      await queryClient.invalidateQueries({ queryKey: queryKeys.account.orders });
      if (buyNowLine) {
        clearBuyNow();
      } else {
        clear();
      }
      setConfirmed(order);
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to place order"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (confirmed) return <Confirmation order={confirmed} />;

  if (checkoutLines.length === 0) {
    return (
      <div className="container-bg py-24 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-secondary">
          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="display mb-3 text-3xl md:text-4xl">Your bag is empty.</h1>
        <p className="text-sm text-muted-foreground mb-6">Looks like you haven't added any products to your bag yet.</p>
        <Link to="/shop" className="inline-block bg-primary px-8 py-3.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground">
          Continue Shopping
        </Link>
      </div>
    );
  }

  const upd = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="min-h-screen bg-background">
      {/* Top Zellbury-Style Minimal Checkout Header */}
      <header className="border-b border-border bg-background py-4 px-6 md:px-12">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-[0.25em] uppercase hover:opacity-80">
            BALY
          </Link>
          <Link to="/cart" className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">
            <ShoppingBag className="h-5 w-5" />
            <span className="hidden sm:inline">Bag ({checkoutLines.reduce((s, l) => s + l.qty, 0)})</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 lg:py-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-14">
          {/* LEFT COLUMN: Customer & Order Form */}
          <form onSubmit={submit} className="space-y-8">
            {/* 1. Contact */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">Contact</h2>
                {!user && (
                  <Link to="/login" className="text-xs text-foreground underline underline-offset-4 hover:text-muted-foreground">
                    Sign in
                  </Link>
                )}
              </div>
              <div className="relative">
                <input
                  required
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => upd("email", e.target.value)}
                  className="w-full rounded border border-border bg-background px-3.5 py-3 text-sm outline-none transition focus:border-foreground focus:ring-1 focus:ring-foreground"
                />
                <button type="button" title="We'll send order updates and invoice to this email" className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground">
                  <HelpCircle className="h-4 w-4" />
                </button>
              </div>
              <label className="flex items-center gap-2.5 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.emailOffers}
                  onChange={(e) => upd("emailOffers", e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-foreground"
                />
                <span>Email me with news, seasonal drops, and exclusive offers</span>
              </label>
            </section>

            {/* 2. Delivery */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">Delivery</h2>
                {isInternational ? (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    <Globe className="h-3 w-3" /> International Order
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    🇵🇰 Nationwide Delivery
                  </span>
                )}
              </div>

              {/* Country Selector */}
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Country / Region
                </label>
                <select
                  value={form.country}
                  onChange={(e) => upd("country", e.target.value)}
                  className="w-full rounded border border-border bg-background px-3.5 py-3 text-sm font-medium outline-none transition focus:border-foreground focus:ring-1 focus:ring-foreground"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.name}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* First & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  placeholder="First name"
                  value={form.firstName}
                  onChange={(e) => upd("firstName", e.target.value)}
                  className="w-full rounded border border-border bg-background px-3.5 py-3 text-sm outline-none transition focus:border-foreground focus:ring-1 focus:ring-foreground"
                />
                <input
                  required
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={(e) => upd("lastName", e.target.value)}
                  className="w-full rounded border border-border bg-background px-3.5 py-3 text-sm outline-none transition focus:border-foreground focus:ring-1 focus:ring-foreground"
                />
              </div>

              {/* Street Address */}
              <input
                required
                placeholder="Address"
                value={form.address}
                onChange={(e) => upd("address", e.target.value)}
                className="w-full rounded border border-border bg-background px-3.5 py-3 text-sm outline-none transition focus:border-foreground focus:ring-1 focus:ring-foreground"
              />

              {/* Address Line 2 */}
              <input
                placeholder="Apartment, suite, unit, etc. (optional)"
                value={form.address2}
                onChange={(e) => upd("address2", e.target.value)}
                className="w-full rounded border border-border bg-background px-3.5 py-3 text-sm outline-none transition focus:border-foreground focus:ring-1 focus:ring-foreground"
              />

              {/* City & Postal Code */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <input
                    required
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => upd("city", e.target.value)}
                    list="city-suggestions"
                    className="w-full rounded border border-border bg-background px-3.5 py-3 text-sm outline-none transition focus:border-foreground focus:ring-1 focus:ring-foreground"
                  />
                  {!isInternational && (
                    <datalist id="city-suggestions">
                      {shippingZones
                        .filter((entry) => !entry.isUniversal)
                        .map((entry) => (
                          <option key={entry.id} value={entry.city} />
                        ))}
                      <option value="Karachi" />
                      <option value="Lahore" />
                      <option value="Islamabad" />
                      <option value="Rawalpindi" />
                      <option value="Faisalabad" />
                      <option value="Attock" />
                      <option value="Peshawar" />
                      <option value="Multan" />
                      <option value="Sialkot" />
                      <option value="Gujranwala" />
                      <option value="Quetta" />
                    </datalist>
                  )}
                </div>
                <input
                  placeholder="Postal code (optional)"
                  value={form.postal}
                  onChange={(e) => upd("postal", e.target.value)}
                  className="w-full rounded border border-border bg-background px-3.5 py-3 text-sm outline-none transition focus:border-foreground focus:ring-1 focus:ring-foreground"
                />
              </div>

              {/* Phone */}
              <div className="relative">
                <input
                  required
                  type="tel"
                  placeholder={isInternational ? "Phone (+ Country Code)" : "Phone (03XX-XXXXXXX)"}
                  value={form.phone}
                  onChange={(e) => upd("phone", e.target.value)}
                  className="w-full rounded border border-border bg-background px-3.5 py-3 text-sm outline-none transition focus:border-foreground focus:ring-1 focus:ring-foreground"
                />
                <button type="button" title="Used only to coordinate delivery updates with the courier" className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground">
                  <HelpCircle className="h-4 w-4" />
                </button>
              </div>

              <label className="flex items-center gap-2.5 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.saveInfo}
                  onChange={(e) => upd("saveInfo", e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-foreground"
                />
                <span>Save this information for next time</span>
              </label>
            </section>

            {/* 3. Shipping Method */}
            <section className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight">Shipping method</h2>
              <div className="overflow-hidden rounded border border-border bg-background">
                {isInternational ? (
                  <div className="p-4 space-y-2">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shipping_method"
                          checked={true}
                          readOnly
                          className="h-4 w-4 text-primary focus:ring-foreground"
                        />
                        <span className="text-sm font-semibold">✈ International Express (DHL / FedEx)</span>
                      </div>
                      <span className="text-sm font-semibold">Rs 3,500.00</span>
                    </label>
                    <p className="text-xs text-muted-foreground pl-7">
                      Estimated 4-7 business days with end-to-end international tracking.
                    </p>
                  </div>
                ) : (
                  <>
                    <label
                      className={`flex items-center justify-between p-4 cursor-pointer transition border-b border-border ${
                        form.shippingMethod === "standard" ? "bg-secondary/40" : "hover:bg-secondary/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shipping_method"
                          checked={form.shippingMethod === "standard"}
                          onChange={() => upd("shippingMethod", "standard")}
                          className="h-4 w-4 text-primary focus:ring-foreground"
                        />
                        <span className="text-sm font-medium">Delivery + COD Fee</span>
                      </div>
                      <span className="text-sm font-semibold">Rs {zone?.fee ?? 250}.00</span>
                    </label>

                    <label
                      className={`flex items-center justify-between p-4 cursor-pointer transition ${
                        form.shippingMethod === "free_online" ? "bg-secondary/40" : "hover:bg-secondary/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shipping_method"
                          checked={form.shippingMethod === "free_online"}
                          onChange={() => {
                            upd("shippingMethod", "free_online");
                            if (form.payment === "cod") upd("payment", "card");
                          }}
                          className="h-4 w-4 text-primary focus:ring-foreground"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Free Delivery | Online Payment</span>
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            PROMO
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground line-through">Rs 250.00</span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">FREE</span>
                      </div>
                    </label>
                  </>
                )}
              </div>
            </section>

            {/* 4. Payment */}
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Payment</h2>
                <p className="text-xs text-muted-foreground">All transactions are secure, encrypted, and monitored.</p>
              </div>

              {isInternational && (
                <div className="flex items-start gap-2.5 rounded border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300">
                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="font-semibold block">International Advance Payment Rule:</span>
                    COD is not available for orders outside Pakistan. International orders require advance payment verification before shipment.
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded border border-border bg-background divide-y divide-border">
                {/* Option 1: Cash on Delivery (Pakistan only) */}
                {!isInternational && (
                  <div>
                    <label
                      className={`flex items-center justify-between p-4 cursor-pointer transition ${
                        form.payment === "cod" ? "bg-secondary/40" : "hover:bg-secondary/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="payment_option"
                          checked={form.payment === "cod"}
                          onChange={() => upd("payment", "cod")}
                          className="h-4 w-4 text-primary focus:ring-foreground"
                        />
                        <div className="flex items-center gap-2">
                          <Banknote className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Cash on Delivery (COD)</span>
                        </div>
                      </div>
                    </label>
                    {form.payment === "cod" && (
                      <div className="border-t border-border bg-secondary/20 px-4 py-3 text-xs text-muted-foreground">
                        Cash Handling Charges <strong className="text-foreground">Rs 50</strong> applies on all COD orders. Pay cash to the courier upon parcel arrival.
                      </div>
                    )}
                  </div>
                )}

                {/* Option 2: Credit / Debit Card (Online Payment) */}
                <div>
                  <label
                    className={`flex items-center justify-between p-4 cursor-pointer transition ${
                      form.payment === "card" ? "bg-secondary/40" : "hover:bg-secondary/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment_option"
                        checked={form.payment === "card"}
                        onChange={() => upd("payment", "card")}
                        className="h-4 w-4 text-primary focus:ring-foreground"
                      />
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {isInternational ? "Credit / Debit Card (Visa, MasterCard, Amex)" : "Debit / Credit Card (Online Payment)"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 text-[10px] font-bold text-muted-foreground">
                      <span className="rounded bg-secondary px-1.5 py-0.5 border border-border">VISA</span>
                      <span className="rounded bg-secondary px-1.5 py-0.5 border border-border">MC</span>
                    </div>
                  </label>
                  {form.payment === "card" && (
                    <div className="border-t border-border bg-secondary/15 p-4 space-y-3">
                      <input
                        placeholder="Card number (16 digits)"
                        value={form.cardNumber}
                        onChange={(e) => upd("cardNumber", e.target.value)}
                        maxLength={19}
                        className="w-full rounded border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          placeholder="Expiration date (MM / YY)"
                          value={form.cardExp}
                          onChange={(e) => upd("cardExp", e.target.value)}
                          maxLength={5}
                          className="w-full rounded border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground"
                        />
                        <input
                          placeholder="Security code (CVV)"
                          value={form.cardCvc}
                          onChange={(e) => upd("cardCvc", e.target.value)}
                          maxLength={4}
                          className="w-full rounded border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground"
                        />
                      </div>
                      <input
                        placeholder="Name on card"
                        value={form.cardName}
                        onChange={(e) => upd("cardName", e.target.value)}
                        className="w-full rounded border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground"
                      />
                    </div>
                  )}
                </div>

                {/* Option 3: JazzCash / EasyPaisa / Bank Transfer */}
                <div>
                  <label
                    className={`flex items-center justify-between p-4 cursor-pointer transition ${
                      form.payment === "bank_transfer" || form.payment === "jazzcash" || form.payment === "easypaisa"
                        ? "bg-secondary/40"
                        : "hover:bg-secondary/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment_option"
                        checked={form.payment === "bank_transfer" || form.payment === "jazzcash" || form.payment === "easypaisa"}
                        onChange={() => upd("payment", isInternational ? "bank_transfer" : "jazzcash")}
                        className="h-4 w-4 text-primary focus:ring-foreground"
                      />
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {isInternational
                            ? "International Wire / SWIFT / Remittance (Advance)"
                            : "JazzCash / EasyPaisa / Bank Transfer (Advance)"}
                        </span>
                      </div>
                    </div>
                  </label>

                  {(form.payment === "bank_transfer" || form.payment === "jazzcash" || form.payment === "easypaisa") && (
                    <div className="border-t border-border bg-secondary/15 p-4 space-y-4 text-xs">
                      {!isInternational ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => upd("payment", "jazzcash")}
                            className={`flex-1 rounded border py-2 text-center font-semibold ${
                              form.payment === "jazzcash" ? "border-foreground bg-foreground text-background" : "border-border bg-background"
                            }`}
                          >
                            JazzCash
                          </button>
                          <button
                            type="button"
                            onClick={() => upd("payment", "easypaisa")}
                            className={`flex-1 rounded border py-2 text-center font-semibold ${
                              form.payment === "easypaisa" ? "border-foreground bg-foreground text-background" : "border-border bg-background"
                            }`}
                          >
                            EasyPaisa
                          </button>
                          <button
                            type="button"
                            onClick={() => upd("payment", "bank_transfer")}
                            className={`flex-1 rounded border py-2 text-center font-semibold ${
                              form.payment === "bank_transfer" ? "border-foreground bg-foreground text-background" : "border-border bg-background"
                            }`}
                          >
                            Bank Transfer
                          </button>
                        </div>
                      ) : null}

                      <div className="rounded border border-border bg-background p-3.5 space-y-1 text-muted-foreground leading-relaxed">
                        <div className="font-semibold text-foreground">
                          {form.payment === "jazzcash"
                            ? "JazzCash Account"
                            : form.payment === "easypaisa"
                              ? "EasyPaisa Account"
                              : isInternational
                                ? "International Wire Account Details"
                                : "Bank Al Habib / Meezan Bank"}
                        </div>
                        <div>Account Title: <strong className="text-foreground">Bilal Garments</strong></div>
                        <div>Account / IBAN: <strong className="text-foreground font-mono">PK64MEZN0001234567890123</strong></div>
                        {isInternational && <div>SWIFT / BIC Code: <strong className="text-foreground font-mono">MEZNPKKAXXX</strong></div>}
                        <div>Mobile / WhatsApp Proof: <strong className="text-foreground">+92 300 0000000</strong></div>
                      </div>

                      <div className="space-y-2">
                        <input
                          placeholder="Transaction / Reference ID (TID / MTCN)"
                          value={form.walletReference}
                          onChange={(e) => upd("walletReference", e.target.value)}
                          className="w-full rounded border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground"
                        />
                        <label className="block">
                          <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                            Payment receipt / screenshot (optional)
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setProof(e.target.files?.[0] ?? null)}
                            className="w-full rounded border border-border bg-background px-3 py-2 text-xs outline-none focus:border-foreground"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 5. Billing Address */}
            <section className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight">Billing address</h2>
              <div className="overflow-hidden rounded border border-border bg-background divide-y divide-border">
                <label
                  className={`flex items-center gap-3 p-4 cursor-pointer transition ${
                    form.billingSame ? "bg-secondary/40" : "hover:bg-secondary/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="billing_option"
                    checked={form.billingSame}
                    onChange={() => upd("billingSame", true)}
                    className="h-4 w-4 text-primary focus:ring-foreground"
                  />
                  <span className="text-sm font-medium">Same as shipping address</span>
                </label>

                <label
                  className={`flex items-center gap-3 p-4 cursor-pointer transition ${
                    !form.billingSame ? "bg-secondary/40" : "hover:bg-secondary/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="billing_option"
                    checked={!form.billingSame}
                    onChange={() => upd("billingSame", false)}
                    className="h-4 w-4 text-primary focus:ring-foreground"
                  />
                  <span className="text-sm font-medium">Use a different billing address</span>
                </label>
              </div>

              {!form.billingSame && (
                <div className="rounded border border-border bg-secondary/10 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="First name"
                      value={form.billingFirstName}
                      onChange={(e) => upd("billingFirstName", e.target.value)}
                      className="w-full rounded border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground"
                    />
                    <input
                      placeholder="Last name"
                      value={form.billingLastName}
                      onChange={(e) => upd("billingLastName", e.target.value)}
                      className="w-full rounded border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground"
                    />
                  </div>
                  <input
                    placeholder="Billing address"
                    value={form.billingAddress}
                    onChange={(e) => upd("billingAddress", e.target.value)}
                    className="w-full rounded border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="City"
                      value={form.billingCity}
                      onChange={(e) => upd("billingCity", e.target.value)}
                      className="w-full rounded border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground"
                    />
                    <input
                      placeholder="Postal code"
                      value={form.billingPostal}
                      onChange={(e) => upd("billingPostal", e.target.value)}
                      className="w-full rounded border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground"
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Complete Order Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-foreground py-4 text-sm font-bold uppercase tracking-[0.18em] text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
              >
                {isSubmitting ? "Processing order..." : "Complete order"}
              </button>
            </div>

            {/* Policy Links */}
            <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-border pt-6 text-xs text-muted-foreground">
              <Link to="/refund-policy" className="hover:text-foreground underline underline-offset-4">
                Refund policy
              </Link>
              <Link to="/faq" className="hover:text-foreground underline underline-offset-4">
                Shipping
              </Link>
              <Link to="/privacy" className="hover:text-foreground underline underline-offset-4">
                Privacy policy
              </Link>
              <Link to="/terms" className="hover:text-foreground underline underline-offset-4">
                Terms of service
              </Link>
            </footer>
          </form>

          {/* RIGHT COLUMN: Order Summary Card */}
          <aside className="h-fit rounded-lg border border-border bg-secondary/30 p-6 lg:sticky lg:top-8 space-y-6">
            <h2 className="text-base font-semibold tracking-tight">Order summary</h2>

            {/* Item List */}
            <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
              {checkoutLines.map((line) => (
                <div key={line.id} className="flex items-center gap-3.5">
                  <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded border border-border bg-secondary">
                    {line.image ? (
                      <img src={line.image} alt={line.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-end p-1 text-[9px] text-muted-foreground">{line.name}</div>
                    )}
                    <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background shadow">
                      {line.qty}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-1 text-sm font-medium">{line.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[line.color, line.size].filter(Boolean).join(" / ") || "Standard"}
                    </p>
                  </div>

                  <div className="text-sm font-semibold whitespace-nowrap">
                    {formatPrice(line.unitPrice * line.qty)}
                  </div>
                </div>
              ))}
            </div>

            {/* Discount Code Input */}
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <input
                placeholder="Discount code"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                className="min-w-0 flex-1 rounded border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-foreground"
              />
              <button
                type="submit"
                className="rounded bg-secondary px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-foreground hover:bg-muted"
              >
                Apply
              </button>
            </form>

            {appliedCoupon && (
              <div className="flex items-center justify-between rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Tag className="h-3.5 w-3.5" /> {appliedCoupon.code} ({appliedCoupon.label})
                </span>
                <button type="button" onClick={removeCoupon} className="hover:opacity-75">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Calculations Breakdown */}
            <div className="space-y-2.5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="text-foreground font-medium">{formatPrice(rawSubtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Discount</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  Shipping <HelpCircle className="h-3.5 w-3.5" title="Standard delivery or free promo" />
                </span>
                <span className="text-foreground font-medium">
                  {shippingFee === 0 ? <strong className="text-emerald-600 dark:text-emerald-400">FREE</strong> : formatPrice(shippingFee)}
                </span>
              </div>

              {codFee > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>COD Handling Charge</span>
                  <span className="text-foreground font-medium">{formatPrice(codFee)}</span>
                </div>
              )}

              <div className="border-t border-border pt-3.5 space-y-2">
                <div className="flex items-baseline justify-between text-base font-bold">
                  <span>Total</span>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-muted-foreground mr-1.5">PKR</span>
                    <span className="text-lg font-black">{formatPrice(total)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span>Estimated USD:</span>
                  <span className="text-foreground font-semibold">≈ {formatUsdShort(total)} USD</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Including {formatPrice(estimatedTax)} in taxes (Rate: $1 ≈ Rs. {pkrPerUsd.toFixed(2)}, {exchangeRateSource})
                </div>
                <div className="rounded bg-secondary/80 px-2.5 py-1.5 text-[11px] text-muted-foreground text-center font-medium border border-border/60">
                  🇵🇰 All prices & transactions are charged in <strong>PKR (Pakistani Rupees)</strong>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Confirmation({ order }: { order: Order }) {
  return (
    <div className="container-bg max-w-2xl py-16 md:py-24">
      <div className="text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="display text-3xl md:text-5xl">Thank you for your order!</h1>
        <p className="mt-2.5 text-sm text-muted-foreground">
          Order number: <strong className="text-foreground font-mono">{order.id}</strong>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          A confirmation email and receipt invoice has been sent to <strong className="text-foreground">{order.email}</strong>.
        </p>
      </div>

      <div className="mt-8 space-y-3 rounded-lg border border-border bg-secondary/30 p-6 text-sm">
        <div className="flex justify-between border-b border-border pb-2.5">
          <span className="text-muted-foreground">Order Total</span>
          <span className="font-bold text-base">{formatPrice(order.total)}</span>
        </div>
        <div className="flex justify-between border-b border-border pb-2.5">
          <span className="text-muted-foreground">Payment Method</span>
          <span className="font-semibold uppercase tracking-wider text-xs">{order.payment}</span>
        </div>
        <div className="flex justify-between border-b border-border pb-2.5">
          <span className="text-muted-foreground">Destination</span>
          <span className="text-right">
            {order.shipping.address}, {order.shipping.city}, {order.shipping.country}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Delivery Status</span>
          <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            Order Confirmed
          </span>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/invoice/$orderNumber"
          params={{ orderNumber: order.id }}
          search={{ token: order.token }}
          className="rounded border border-foreground px-6 py-3 text-xs font-semibold uppercase tracking-widest hover:bg-foreground hover:text-background transition"
        >
          View Invoice
        </Link>
        <Link
          to="/track-order"
          className="rounded bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-widest text-primary-foreground hover:opacity-90 transition"
        >
          Track Parcel
        </Link>
        <Link
          to="/shop"
          className="rounded border border-border px-6 py-3 text-xs font-semibold uppercase tracking-widest hover:border-foreground transition"
        >
          Back to Shop
        </Link>
      </div>
    </div>
  );
}
