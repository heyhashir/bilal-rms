import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer, RefreshCcw, ScanLine, Trash2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { adminCatalogApi } from "@/lib/admin-catalog-api";
import { adminEmployeesApi } from "@/lib/admin-employees-api";
import { adminPosApi } from "@/lib/admin-pos-api";
import { adminSettingsApi } from "@/lib/admin-settings-api";
import type { Employee, PosSale, PosSaleInput } from "@/lib/admin-types";
import {
  applySaleToCachedStock,
  getPosDeviceKey,
  loadPosCache,
  loadPosSyncState,
  loadQueuedSales,
  patchPosSyncState,
  queuePosSale,
  removeQueuedSale,
  savePosCache,
  type PosSyncState,
} from "@/lib/pos-local";
import { formatPrice } from "@/lib/format";
import { getEffectiveAmount } from "@/lib/format";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { syncApi } from "@/lib/sync-api";
import type { Product, ProductVariant, StorefrontSettings } from "@/lib/catalog-types";
import { ActionButton, EmptyState, Field, Modal, PageHeader, SelectField, StatusPill } from "@/components/admin/primitives";

export const Route = createFileRoute("/pos")({
  component: PosTerminal,
});

type SaleChoice = {
  key: string;
  productId: string;
  variantId?: string;
  label: string;
  subtitle: string;
  unitPrice: number;
  stock: number;
  image: string;
  barcode: string;
  qrCode: string;
  size: string;
  color: string;
  brand: string;
  category: string;
};

type CartLine = SaleChoice & {
  qty: number;
  employeeId: string;
};

type PosQuerySource = "live" | "cache";

const paymentOptions = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "EasyPaisa" },
  { value: "bank_transfer", label: "Bank transfer" },
];

function PosTerminal() {
  const { user, isPending } = useProtectedUser({ role: ["admin", "manager", "staff"] });
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PosSaleInput["paymentMethod"]>("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] = useState<PosSale | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [offlineMode, setOfflineMode] = useState(false);
  const deviceKey = useMemo(() => getPosDeviceKey(), []);
  const [syncState, setSyncState] = useState<PosSyncState>(() =>
    loadPosSyncState() ?? {
      deviceKey,
      lastCursor: null,
      lastBootstrapAt: null,
      lastSyncAttemptAt: null,
      lastSuccessfulSyncAt: null,
      lastSyncError: "",
      retryCount: 0,
      failedJobs: 0,
      queueSize: loadQueuedSales().length,
    },
  );
  const canLoadPos = !isPending && Boolean(user) && ["admin", "manager", "staff"].includes(user.role);

  const updateSyncState = (patch: Partial<PosSyncState>) => {
    const next = patchPosSyncState(deviceKey, patch);
    setSyncState(next);
    return next;
  };

  const productsQuery = useQuery({
    queryKey: queryKeys.pos.products,
    enabled: canLoadPos,
    queryFn: async () => {
      try {
        const payload = await adminCatalogApi.products();
        return { products: payload.products, source: "live" as PosQuerySource };
      } catch (error) {
        const cached = loadPosCache();
        if (cached) {
          return { products: cached.products, source: "cache" as PosQuerySource };
        }

        throw error;
      }
    },
  });

  const employeesQuery = useQuery({
    queryKey: queryKeys.pos.employees,
    enabled: canLoadPos,
    queryFn: async () => {
      try {
        const payload = await adminEmployeesApi.employees();
        return { employees: payload.employees, source: "live" as PosQuerySource };
      } catch (error) {
        const cached = loadPosCache();
        if (cached) {
          return { employees: cached.employees, source: "cache" as PosQuerySource };
        }

        throw error;
      }
    },
  });

  const settingsQuery = useQuery({
    queryKey: queryKeys.pos.settings,
    enabled: canLoadPos,
    queryFn: async () => {
      try {
        const payload = await adminSettingsApi.settings();
        return { settings: payload.settings, source: "live" as PosQuerySource };
      } catch (error) {
        const cached = loadPosCache();
        if (cached) {
          return { settings: cached.settings, source: "cache" as PosQuerySource };
        }

        throw error;
      }
    },
  });

  const products = useMemo(
    () =>
      (productsQuery.data?.products ?? []).filter((product) => product.stock > 0 || product.stockMode === "variant"),
    [productsQuery.data],
  );
  const employees = useMemo(
    () =>
      (employeesQuery.data?.employees ?? []).filter((employee) => employee.status === "active"),
    [employeesQuery.data],
  );
  const settings = settingsQuery.data?.settings ?? null;

  const syncQueuedSales = async () => {
    const queued = loadQueuedSales();
    const attemptedAt = Date.now();
    if (queued.length === 0) {
      setQueueCount(0);
      updateSyncState({
        queueSize: 0,
        lastSyncAttemptAt: attemptedAt,
        lastSuccessfulSyncAt: attemptedAt,
        failedJobs: 0,
        lastSyncError: "",
      });
      return;
    }

    let synced = 0;
    let failed = 0;
    let lastError = "";
    for (const sale of queued) {
      try {
        await adminPosApi.createPosSale(sale);
        removeQueuedSale(sale.saleNumber ?? "");
        synced += 1;
      } catch (error) {
        failed += 1;
        lastError = getErrorMessage(error, "Unable to sync queued sale");
      }
    }

    const remaining = loadQueuedSales().length;
    setQueueCount(remaining);
    updateSyncState({
      queueSize: remaining,
      lastSyncAttemptAt: attemptedAt,
      lastSuccessfulSyncAt: synced > 0 ? Date.now() : syncState.lastSuccessfulSyncAt,
      failedJobs: failed,
      retryCount: syncState.retryCount + failed,
      lastSyncError: failed > 0 ? lastError : "",
    });
    if (synced > 0) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.posSales }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.inventorySnapshot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.inventoryLedger }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.commissions }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pos.products }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.products }),
      ]);
      toast.success(`Synced ${synced} queued sale${synced === 1 ? "" : "s"}`);
    }
  };

  useEffect(() => {
    const bootstrapPos = async () => {
      try {
        const device = await syncApi.registerDevice({ deviceKey, name: "Shop POS", notes: "Browser POS terminal" });
        const bootstrap = await syncApi.syncBootstrap(deviceKey, syncState.lastCursor ?? undefined);
        savePosCache({
          products: bootstrap.products,
          employees: bootstrap.employees,
          settings: bootstrap.settings,
          updatedAt: Date.now(),
        });
        updateSyncState({
          lastCursor: bootstrap.cursor,
          lastBootstrapAt: Date.now(),
          lastSyncError: device.device.lastSyncError,
          queueSize: loadQueuedSales().length,
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.pos.products }),
          queryClient.invalidateQueries({ queryKey: queryKeys.pos.employees }),
          queryClient.invalidateQueries({ queryKey: queryKeys.pos.settings }),
        ]);
        await syncQueuedSales();
      } catch (error) {
        setOfflineMode(true);
        updateSyncState({
          lastSyncAttemptAt: Date.now(),
          lastSyncError: getErrorMessage(error, "Unable to reach sync bootstrap"),
          queueSize: loadQueuedSales().length,
        });
      } finally {
        setQueueCount(loadQueuedSales().length);
      }
    };

    if (canLoadPos) {
      void bootstrapPos();
    }
  }, [canLoadPos, deviceKey]);

  useEffect(() => {
    if (!productsQuery.data || !employeesQuery.data || !settingsQuery.data) {
      return;
    }

    savePosCache({
      products: productsQuery.data.products,
      employees: employeesQuery.data.employees,
      settings: settingsQuery.data.settings,
      updatedAt: Date.now(),
    });
  }, [employeesQuery.data, productsQuery.data, settingsQuery.data]);

  useEffect(() => {
    if (!canLoadPos) {
      return;
    }

    const usingCachedSource =
      productsQuery.data?.source === "cache" ||
      employeesQuery.data?.source === "cache" ||
      settingsQuery.data?.source === "cache";

    setOfflineMode(usingCachedSource);
  }, [canLoadPos, employeesQuery.data, productsQuery.data, settingsQuery.data]);

  const choices = useMemo<SaleChoice[]>(() => {
    const rows: SaleChoice[] = [];
    for (const product of products) {
      if (product.stockMode === "variant" && product.variants.length > 0) {
        for (const variant of product.variants.filter((entry) => entry.isActive)) {
          rows.push({
            key: `${product.id}:${variant.id}`,
            productId: product.id,
            variantId: variant.id,
            label: product.name,
            subtitle: [variant.sku, variant.size, variant.colorName].filter(Boolean).join(" | "),
            unitPrice: variant.priceOverride ?? getEffectiveAmount(product.price, product.salePrice),
            stock: variant.stock,
            image: product.images[0] ?? "",
            barcode: variant.barcode ?? product.barcode ?? "",
            qrCode: variant.qrCode ?? product.qrCode ?? "",
            size: variant.size,
            color: variant.colorName,
            brand: product.brandName ?? "",
            category: product.categoryName,
          });
        }
      } else {
        rows.push({
          key: product.id,
          productId: product.id,
          label: product.name,
          subtitle: product.slug,
          unitPrice: getEffectiveAmount(product.price, product.salePrice),
          stock: product.stock,
          image: product.images[0] ?? "",
          barcode: product.barcode ?? "",
          qrCode: product.qrCode ?? "",
          size: "",
          color: "",
          brand: product.brandName ?? "",
          category: product.categoryName,
        });
      }
    }
    return rows;
  }, [products]);

  const brandOptions = useMemo(
    () => Array.from(new Set(choices.map((choice) => choice.brand).filter(Boolean))).sort((left, right) => left.localeCompare(right)),
    [choices],
  );
  const categoryOptions = useMemo(
    () => Array.from(new Set(choices.map((choice) => choice.category).filter(Boolean))).sort((left, right) => left.localeCompare(right)),
    [choices],
  );

  const filteredChoices = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term && !brandFilter && !categoryFilter) return [];
    return choices
      .filter((choice) => {
        if (brandFilter && choice.brand !== brandFilter) {
          return false;
        }

        if (categoryFilter && choice.category !== categoryFilter) {
          return false;
        }

        if (!term) {
          return true;
        }

        return `${choice.label} ${choice.subtitle} ${choice.barcode} ${choice.qrCode} ${choice.brand} ${choice.category} ${choice.size} ${choice.color}`
          .toLowerCase()
          .includes(term);
      })
      .slice(0, 8);
  }, [brandFilter, categoryFilter, choices, search]);

  const subtotal = cart.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);

  const addChoice = (choice: SaleChoice) => {
    if (choice.stock <= 0) {
      toast.error("This item is out of stock");
      return;
    }

    setCart((current) => {
      const existing = current.find((entry) => entry.productId === choice.productId && entry.variantId === choice.variantId);
      if (existing) {
        return current.map((entry) =>
          entry.productId === choice.productId && entry.variantId === choice.variantId
            ? { ...entry, qty: Math.min(entry.qty + 1, choice.stock) }
            : entry,
        );
      }

      return [...current, { ...choice, qty: 1, employeeId: "" }];
    });
    setSearch("");
  };

  const queueCurrentSale = () => {
    const saleNumber = `OFF-${Date.now().toString(36).toUpperCase()}`;
    const payload: PosSaleInput = {
      saleNumber,
      customerName,
      customerPhone,
      customerEmail,
      paymentMethod,
      paidAmount: subtotal,
      status: "finalized",
      notes,
      deviceKey,
      deviceName: "Shop POS",
      lines: cart.map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        employeeId: line.employeeId || null,
        qty: line.qty,
        unitPrice: line.unitPrice,
      })),
    };

    queuePosSale(payload);
    applySaleToCachedStock(payload);
    setQueueCount(loadQueuedSales().length);
    toast.success("Sale saved locally and queued for sync");
    setReceipt({
      id: saleNumber,
      saleNumber,
      source: "pos",
      status: "finalized",
      customerName,
      customerPhone,
      customerEmail,
      subtotal,
      total: subtotal,
      paidAmount: subtotal,
      paymentMethod,
      notes,
      syncedStatus: "pending",
      syncedAt: null,
      finalizedAt: Date.now(),
      deviceId: deviceKey,
      deviceName: "Shop POS",
      receipt: {
        id: saleNumber,
        receiptNumber: `${settings?.receiptPrefix ?? "REC"}-${saleNumber}`,
        invoiceNumber: `${settings?.invoicePrefix ?? "BG"}-${saleNumber}`,
        reprintCount: 0,
        lastPrintedAt: Date.now(),
      },
      items: cart.map((line) => ({
        id: `${line.productId}-${line.variantId ?? "base"}`,
        productId: line.productId,
        variantId: line.variantId ?? null,
        employeeId: line.employeeId,
        employeeName: employees.find((employee) => employee.id === line.employeeId)?.name ?? "",
        name: line.label,
        slug: line.subtitle,
        sku: line.subtitle,
        image: line.image,
        barcode: line.barcode,
        qrCode: line.qrCode,
        size: line.size,
        color: line.color,
        qty: line.qty,
        refundedQty: 0,
        unitPrice: line.unitPrice,
        lineTotal: line.unitPrice * line.qty,
        commissionRate: null,
        commissionAmount: null,
      })),
      payments: [],
      returns: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setNotes("");
  };

  const checkout = async () => {
    if (cart.length === 0) {
      toast.error("Add at least one item to the bill");
      return;
    }

    const payload: PosSaleInput = {
      customerName,
      customerPhone,
      customerEmail,
      paymentMethod,
      paidAmount: subtotal,
      status: "finalized",
      notes,
      deviceKey,
      deviceName: "Shop POS",
      lines: cart.map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        employeeId: line.employeeId || null,
        qty: line.qty,
        unitPrice: line.unitPrice,
      })),
    };

    if (offlineMode || !navigator.onLine) {
      queueCurrentSale();
      return;
    }

    try {
      const response = await adminPosApi.createPosSale(payload);
      setReceipt(response.sale);
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setNotes("");
      toast.success("POS sale saved");
      setOfflineMode(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.posSales }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.inventorySnapshot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.inventoryLedger }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.commissions }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pos.products }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.products }),
      ]);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save sale"));
    }
  };

  if (isPending) {
    return null;
  }

  if (!user || !["admin", "manager", "staff"].includes(user.role)) {
    return null;
  }

  return (
    <div className="container-bg py-8 md:py-12">
      <PageHeader
        eyebrow="Point of sale"
        title="In-store billing."
        description="Scan barcodes or search products, attribute each line to a salesperson, and print the receipt."
        action={
          <>
            <div className="inline-flex items-center gap-2 border border-border px-3 py-2 text-xs uppercase tracking-widest">
              {offlineMode ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
              {offlineMode ? "Offline cache" : "Live sync"}
            </div>
            <div className="inline-flex items-center gap-2 border border-border px-3 py-2 text-xs uppercase tracking-widest">
              Queue {queueCount}
            </div>
            <ActionButton onClick={() => void syncQueuedSales()} variant="ghost"><RefreshCcw className="h-3.5 w-3.5" /> Sync queued</ActionButton>
            <Link to="/admin" className="inline-flex items-center gap-2 border border-border px-4 py-2.5 text-xs uppercase tracking-widest hover:bg-secondary">
              <ArrowLeft className="h-3.5 w-3.5" /> Admin
            </Link>
          </>
        }
      />

      {!settings || productsQuery.isLoading || employeesQuery.isLoading || settingsQuery.isLoading ? (
        <EmptyState title="Loading POS data" hint="Trying live data first, then falling back to the local cache." />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-5">
            <div className="border border-border p-4">
              <label className="mb-2 block text-xs uppercase tracking-[0.3em] text-muted-foreground">Scan or search</label>
              <div className="relative">
                <ScanLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && filteredChoices[0]) {
                      event.preventDefault();
                      addChoice(filteredChoices[0]);
                    }
                  }}
                  placeholder="Barcode, QR code, SKU, or product name"
                  className="w-full border border-border bg-background py-3 pl-10 pr-3 text-sm outline-none focus:border-foreground"
                />
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <select
                  value={brandFilter}
                  onChange={(event) => setBrandFilter(event.target.value)}
                  className="border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">All brands</option>
                  {brandOptions.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">All categories</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              {filteredChoices.length > 0 && (
                <div className="mt-3 grid gap-2">
                  {filteredChoices.map((choice) => (
                    <button
                      key={choice.key}
                      onClick={() => addChoice(choice)}
                      className="flex items-center justify-between border border-border px-3 py-3 text-left hover:bg-secondary"
                    >
                      <div>
                        <div className="font-medium">{choice.label}</div>
                        <div className="text-xs text-muted-foreground">{choice.subtitle || choice.barcode || choice.qrCode}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatPrice(choice.unitPrice)}</div>
                        <div className="text-xs text-muted-foreground">{choice.stock} in stock</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-border overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-secondary text-xs uppercase tracking-widest">
                  <tr>
                    <th className="p-3 text-left">Item</th>
                    <th className="p-3 text-left">Salesperson</th>
                    <th className="p-3 text-left">Qty</th>
                    <th className="p-3 text-left">Unit</th>
                    <th className="p-3 text-left">Line total</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr>
                      <td className="p-6 text-center text-muted-foreground" colSpan={6}>No items added yet.</td>
                    </tr>
                  ) : (
                    cart.map((line) => (
                      <tr key={line.key} className="border-t border-border">
                        <td className="p-3">
                          <div className="font-medium">{line.label}</div>
                          <div className="text-xs text-muted-foreground">{[line.subtitle, line.barcode || line.qrCode].filter(Boolean).join(" | ")}</div>
                        </td>
                        <td className="p-3 min-w-[180px]">
                          <select
                            value={line.employeeId}
                            onChange={(event) =>
                              setCart((current) =>
                                current.map((entry) => (entry.key === line.key ? { ...entry, employeeId: event.target.value } : entry)),
                              )
                            }
                            className="w-full border border-border bg-background px-2 py-2 text-sm"
                          >
                            <option value="">No attribution</option>
                            {employees.map((employee) => (
                              <option key={employee.id} value={employee.id}>{employee.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min={1}
                            max={line.stock}
                            value={line.qty}
                            onChange={(event) =>
                              setCart((current) =>
                                current.map((entry) =>
                                  entry.key === line.key ? { ...entry, qty: Math.max(1, Number(event.target.value) || 1) } : entry,
                                ),
                              )
                            }
                            className="w-20 border border-border bg-background px-2 py-2 text-sm"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min={0}
                            value={line.unitPrice}
                            onChange={(event) =>
                              setCart((current) =>
                                current.map((entry) =>
                                  entry.key === line.key ? { ...entry, unitPrice: Math.max(0, Number(event.target.value) || 0) } : entry,
                                ),
                              )
                            }
                            className="w-24 border border-border bg-background px-2 py-2 text-sm"
                          />
                        </td>
                        <td className="p-3 font-semibold">{formatPrice(line.unitPrice * line.qty)}</td>
                        <td className="p-3">
                          <button
                            onClick={() => setCart((current) => current.filter((entry) => entry.key !== line.key))}
                            className="p-2 hover:bg-sale hover:text-primary-foreground"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-5">
            <div className="border border-border p-5">
              <div className="mb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">Customer and payment</div>
              <div className="grid gap-3">
                <Field label="Customer name" value={customerName} onChange={setCustomerName} />
                <Field label="Phone" value={customerPhone} onChange={setCustomerPhone} />
                <Field label="Email" value={customerEmail} onChange={setCustomerEmail} type="email" />
                <SelectField label="Payment method" value={paymentMethod} onChange={(value) => setPaymentMethod(value as PosSaleInput["paymentMethod"])} options={paymentOptions} />
                <Field label="Notes" value={notes} onChange={setNotes} textarea />
              </div>
            </div>

            <div className="border border-border p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Bill summary</div>
                  <div className="display text-3xl mt-2">{formatPrice(subtotal)}</div>
                </div>
                <StatusPill status={offlineMode ? "pending" : "synced"} />
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>{cart.length} item line{cart.length === 1 ? "" : "s"} in cart</div>
                <div>{queueCount} queued offline sale{queueCount === 1 ? "" : "s"}</div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <ActionButton onClick={() => void checkout()}>Finalize bill</ActionButton>
                <ActionButton variant="ghost" onClick={() => setCart([])}>Clear cart</ActionButton>
              </div>
            </div>

            <div className="border border-border p-5">
              <div className="mb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">Sync diagnostics</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>Device: <span className="font-medium text-foreground">{deviceKey}</span></div>
                <div>Last bootstrap: <span className="text-foreground">{syncState.lastBootstrapAt ? new Date(syncState.lastBootstrapAt).toLocaleString() : "Never"}</span></div>
                <div>Last sync attempt: <span className="text-foreground">{syncState.lastSyncAttemptAt ? new Date(syncState.lastSyncAttemptAt).toLocaleString() : "Never"}</span></div>
                <div>Last successful sync: <span className="text-foreground">{syncState.lastSuccessfulSyncAt ? new Date(syncState.lastSuccessfulSyncAt).toLocaleString() : "Never"}</span></div>
                <div>Cursor: <span className="font-mono text-foreground">{syncState.lastCursor ?? "Not synced yet"}</span></div>
                <div>Backlog: <span className="text-foreground">{syncState.queueSize}</span></div>
                <div>Retry count: <span className="text-foreground">{syncState.retryCount}</span></div>
                <div>Failed syncs: <span className="text-foreground">{syncState.failedJobs}</span></div>
                {syncState.lastSyncError && <div className="text-sale">Last error: {syncState.lastSyncError}</div>}
              </div>
            </div>
          </section>
        </div>
      )}

      {receipt && (
        <Modal
          title={`Receipt ${receipt.receipt?.receiptNumber ?? receipt.saleNumber}`}
          onClose={() => setReceipt(null)}
          wide
          footer={
            <>
              <ActionButton variant="ghost" onClick={() => setReceipt(null)}>Close</ActionButton>
              <ActionButton onClick={() => window.print()}><Printer className="h-3.5 w-3.5" /> Print</ActionButton>
            </>
          }
        >
          <div className="mx-auto max-w-xl space-y-4">
            <div className="text-center">
              <div className="display text-2xl">{settings?.name}</div>
              {settings?.thermalHeader && <pre className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{settings.thermalHeader}</pre>}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Receipt</div>
                <div>{receipt.receipt?.receiptNumber ?? receipt.saleNumber}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Status</div>
                <div>{receipt.syncedStatus}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Customer</div>
                <div>{receipt.customerName || "Walk-in customer"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Payment</div>
                <div>{receipt.paymentMethod}</div>
              </div>
            </div>
            <div className="border border-border">
              {receipt.items.map((line) => (
                <div key={line.id} className="flex items-start justify-between border-b border-border p-3 last:border-0">
                  <div>
                    <div className="font-medium">{line.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[line.size, line.color, line.employeeName].filter(Boolean).join(" | ")} x {line.qty}
                    </div>
                  </div>
                  <div className="font-semibold">{formatPrice(line.lineTotal)}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3 font-semibold">
              <span>Total</span>
              <span>{formatPrice(receipt.total)}</span>
            </div>
            {settings?.thermalFooter && <pre className="whitespace-pre-wrap text-center text-sm text-muted-foreground">{settings.thermalFooter}</pre>}
          </div>
        </Modal>
      )}
    </div>
  );
}
