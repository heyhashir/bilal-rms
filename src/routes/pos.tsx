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
import type { DesktopUpdateManifest } from "@/lib/desktop-bridge";
import {
  applySaleToCachedStock,
  findOfflineReceipt,
  getPosDeviceKey,
  loadPosCache,
  loadOfflineReceipts,
  loadQueuedRefunds,
  loadPosSyncState,
  loadQueuedSales,
  patchPosSyncState,
  persistOfflineSale,
  persistOfflineRefund,
  type PosRefundQueueItem,
  rememberReceipt,
  removeQueuedRefund,
  removeQueuedSale,
  savePosCache,
  type PosSyncState,
} from "@/lib/pos-local";
import { getDesktopBridge } from "@/lib/desktop-bridge";
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
  const [receiptLookup, setReceiptLookup] = useState("");
  const [storedReceipts, setStoredReceipts] = useState<PosSale[]>([]);
  const [updateMessage, setUpdateMessage] = useState("");
  const [desktopUpdate, setDesktopUpdate] = useState<DesktopUpdateManifest | null>(null);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
  const [refundReason, setRefundReason] = useState("Customer return");
  const [refundNote, setRefundNote] = useState("");
  const [refundQtys, setRefundQtys] = useState<Record<string, number>>({});
  const [queueCount, setQueueCount] = useState(0);
  const [offlineMode, setOfflineMode] = useState(false);
  const [initialCache] = useState(() => loadPosCache());
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
      queueSize: loadQueuedSales().length + loadQueuedRefunds().length,
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
    enabled: false,
    initialData: initialCache ? { products: initialCache.products, source: "cache" as PosQuerySource } : undefined,
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
    enabled: false,
    initialData: initialCache ? { employees: initialCache.employees, source: "cache" as PosQuerySource } : undefined,
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
    enabled: false,
    initialData: initialCache ? { settings: initialCache.settings, source: "cache" as PosQuerySource } : undefined,
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
    const queuedRefunds = loadQueuedRefunds();
    const attemptedAt = Date.now();
    if (queued.length === 0 && queuedRefunds.length === 0) {
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
        await syncApi.pushSyncEvents({
          deviceKey,
          cursor: syncState.lastCursor ?? undefined,
          jobs: [
            {
              jobKey: `${sale.saleNumber ?? "queued-sale"}:sale`,
              direction: "push",
              entityType: "pos-sale",
              entityId: sale.saleNumber,
              payload: sale,
              status: "synced",
            },
          ],
        });
        synced += 1;
      } catch (error) {
        failed += 1;
        lastError = getErrorMessage(error, "Unable to sync queued sale");
      }
    }

    for (const refund of queuedRefunds) {
      try {
        await adminPosApi.refundPosSale(refund.saleNumber, {
          reason: refund.reason,
          note: refund.note,
          items: refund.items,
        });
        removeQueuedRefund(refund.jobKey);
        await syncApi.pushSyncEvents({
          deviceKey,
          cursor: syncState.lastCursor ?? undefined,
          jobs: [
            {
              jobKey: refund.jobKey,
              direction: "push",
              entityType: "pos-refund",
              entityId: refund.saleNumber,
              payload: refund,
              status: "synced",
            },
          ],
        });
        synced += 1;
      } catch (error) {
        failed += 1;
        lastError = getErrorMessage(error, "Unable to sync queued refund");
      }
    }

    const remaining = loadQueuedSales().length + loadQueuedRefunds().length;
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
      toast.success(`Synced ${synced} queued item${synced === 1 ? "" : "s"}`);
    }
  };

  useEffect(() => {
    const bootstrapPos = async () => {
      try {
        const bootstrap = await syncApi.syncBootstrap(deviceKey, syncState.lastCursor ?? undefined);
        const nextCache = {
          products: bootstrap.products,
          employees: bootstrap.employees,
          settings: bootstrap.settings,
          updatedAt: Date.now(),
        };
        savePosCache(nextCache);
        queryClient.setQueryData(queryKeys.pos.products, { products: bootstrap.products, source: "live" as PosQuerySource });
        queryClient.setQueryData(queryKeys.pos.employees, { employees: bootstrap.employees, source: "live" as PosQuerySource });
        queryClient.setQueryData(queryKeys.pos.settings, { settings: bootstrap.settings, source: "live" as PosQuerySource });
        updateSyncState({
          lastCursor: bootstrap.cursor,
          lastBootstrapAt: Date.now(),
          lastSyncError: "",
          queueSize: loadQueuedSales().length + loadQueuedRefunds().length,
        });
        void syncQueuedSales();
        const desktopBridge = getDesktopBridge();
        if (desktopBridge) {
          void desktopBridge
            .checkForUpdates({
              deviceKey,
              currentVersion: desktopBridge.getDesktopContext().appVersion,
            })
            .then((update) => {
              setDesktopUpdate(update);
              setUpdateMessage(
                update.available
                  ? `Desktop update ${update.latestVersion} is available.`
                  : `Desktop app is up to date (${update.latestVersion}).`,
              );
            })
            .catch(() => undefined);
        }
      } catch (error) {
        setOfflineMode(true);
        updateSyncState({
          lastSyncAttemptAt: Date.now(),
          lastSyncError: getErrorMessage(error, "Unable to reach sync bootstrap"),
          queueSize: loadQueuedSales().length + loadQueuedRefunds().length,
        });
      } finally {
        setQueueCount(loadQueuedSales().length + loadQueuedRefunds().length);
        setStoredReceipts(loadOfflineReceipts());
      }
    };

    if (canLoadPos) {
      void bootstrapPos();
    }
  }, [canLoadPos, deviceKey]);

  const installDesktopUpdate = async () => {
    const bridge = getDesktopBridge();
    if (!bridge || !desktopUpdate?.available || !desktopUpdate.windows?.installerUrl) {
      return;
    }

    try {
      setIsInstallingUpdate(true);
      await bridge.installUpdate({
        installerUrl: desktopUpdate.windows.installerUrl,
      });
      toast.success("Update installer launched. The app will close so Windows can continue the upgrade.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to launch desktop update"));
    } finally {
      setIsInstallingUpdate(false);
    }
  };

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

  useEffect(() => {
    setRefundQtys({});
    setRefundReason("Customer return");
    setRefundNote("");
  }, [receipt?.saleNumber]);

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

    const offlineReceipt = persistOfflineSale({
      sale: payload,
      employees,
      settings,
    });
    applySaleToCachedStock(payload);
    setQueueCount(loadQueuedSales().length + loadQueuedRefunds().length);
    toast.success("Sale saved locally and queued for sync");
    setReceipt(offlineReceipt);
    setStoredReceipts(loadOfflineReceipts());
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setNotes("");
  };

  const processRefund = async () => {
    if (!receipt) {
      return;
    }

    const items = receipt.items
      .map((line) => {
        const qty = Math.max(0, refundQtys[line.id] ?? 0);
        const remaining = line.qty - line.refundedQty;
        if (qty <= 0 || qty > remaining) {
          return null;
        }

        return {
          saleItemId: line.id,
          qty,
        };
      })
      .filter((entry): entry is { saleItemId: string; qty: number } => Boolean(entry));

    if (items.length === 0) {
      toast.error("Enter at least one refundable quantity");
      return;
    }

    if (offlineMode || !navigator.onLine) {
      const refundJob: PosRefundQueueItem = {
        jobKey: `refund-${receipt.saleNumber}-${Date.now().toString(36).toUpperCase()}`,
        saleNumber: receipt.saleNumber,
        reason: refundReason.trim() || "Customer return",
        note: refundNote.trim(),
        items,
      };

      const nextReceipt = persistOfflineRefund({ refund: refundJob });
      if (!nextReceipt) {
        toast.error("Receipt not found in local history");
        return;
      }

      setReceipt(nextReceipt);
      setStoredReceipts(loadOfflineReceipts());
      setQueueCount(loadQueuedSales().length + loadQueuedRefunds().length);
      toast.success("Refund saved locally and queued for sync");
      return;
    }

    try {
      const response = await adminPosApi.refundPosSale(receipt.saleNumber, {
        reason: refundReason.trim() || "Customer return",
        note: refundNote.trim(),
        items,
      });
      rememberReceipt(response.sale);
      setReceipt(response.sale);
      setStoredReceipts(loadOfflineReceipts());
      await syncApi.pushSyncEvents({
        deviceKey,
        cursor: syncState.lastCursor ?? undefined,
        jobs: [
          {
            jobKey: `refund-${response.sale.saleNumber}-${Date.now().toString(36).toUpperCase()}`,
            direction: "push",
            entityType: "pos-refund",
            entityId: response.sale.saleNumber,
            payload: {
              saleNumber: response.sale.saleNumber,
              items,
              reason: refundReason.trim() || "Customer return",
              note: refundNote.trim(),
            },
            status: "synced",
          },
        ],
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.posSales }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.inventorySnapshot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.inventoryLedger }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.commissions }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pos.products }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.products }),
      ]);
      toast.success("Refund processed");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to process refund"));
    }
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
      rememberReceipt(response.sale);
      setStoredReceipts(loadOfflineReceipts());
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
              <ArrowLeft className="h-3.5 w-3.5" /> Management dashboard
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
                {updateMessage && <div className="text-foreground">{updateMessage}</div>}
                {desktopUpdate?.available && desktopUpdate.windows && (
                  <div className="pt-2">
                    <ActionButton onClick={() => void installDesktopUpdate()} disabled={isInstallingUpdate}>
                      {isInstallingUpdate ? "Launching installer..." : `Install desktop update ${desktopUpdate.latestVersion}`}
                    </ActionButton>
                  </div>
                )}
                {syncState.lastSyncError && <div className="text-sale">Last error: {syncState.lastSyncError}</div>}
              </div>
            </div>

            <div className="border border-border p-5">
              <div className="mb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">Receipt lookup</div>
              <div className="flex gap-3">
                <input
                  value={receiptLookup}
                  onChange={(event) => setReceiptLookup(event.target.value)}
                  placeholder="Receipt or sale number"
                  className="flex-1 border border-border bg-background px-3 py-2 text-sm"
                />
                <ActionButton
                  variant="ghost"
                  onClick={() => {
                    const found = findOfflineReceipt(receiptLookup);
                    if (!found) {
                      toast.error("Receipt not found in local history");
                      return;
                    }
                    setReceipt(found);
                  }}
                >
                  Open
                </ActionButton>
              </div>
              <div className="mt-3 space-y-2">
                {storedReceipts.slice(0, 5).map((sale) => (
                  <button
                    key={sale.saleNumber}
                    onClick={() => setReceipt(sale)}
                    className="flex w-full items-center justify-between border border-border px-3 py-2 text-left hover:bg-secondary"
                  >
                    <div>
                      <div className="text-sm font-medium">{sale.receipt?.receiptNumber ?? sale.saleNumber}</div>
                      <div className="text-xs text-muted-foreground">{sale.customerName || "Walk-in customer"}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(sale.createdAt).toLocaleString()}</div>
                  </button>
                ))}
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
              <ActionButton
                onClick={async () => {
                  const bridge = getDesktopBridge();
                  if (bridge) {
                    try {
                      await bridge.printReceipt({ sale: receipt, settings });
                      toast.success("Receipt sent to printer");
                    } catch (error) {
                      toast.error(getErrorMessage(error, "Unable to print receipt"));
                    }
                    return;
                  }

                  window.print();
                }}
              >
                <Printer className="h-3.5 w-3.5" /> Print
              </ActionButton>
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
            <div className="border border-border p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">Process refund</div>
              <div className="space-y-3">
                {receipt.items.map((line) => {
                  const refundable = line.qty - line.refundedQty;
                  return (
                    <div key={`${line.id}-refund`} className="grid gap-2 md:grid-cols-[1fr_120px]">
                      <div>
                        <div className="font-medium">{line.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Refunded {line.refundedQty} / {line.qty}
                        </div>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={Math.max(0, refundable)}
                        disabled={refundable <= 0}
                        value={refundQtys[line.id] ?? 0}
                        onChange={(event) =>
                          setRefundQtys((current) => ({
                            ...current,
                            [line.id]: Math.max(0, Math.min(refundable, Number(event.target.value) || 0)),
                          }))
                        }
                        className="border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  );
                })}
                <Field label="Refund reason" value={refundReason} onChange={setRefundReason} />
                <Field label="Refund note" value={refundNote} onChange={setRefundNote} textarea />
                <div className="flex justify-end">
                  <ActionButton variant="ghost" onClick={() => void processRefund()}>Process refund</ActionButton>
                </div>
              </div>
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
