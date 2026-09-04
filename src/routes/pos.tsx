import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer, RefreshCcw, ScanLine, Trash2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { adminCatalogApi } from "@/lib/admin-catalog-api";
import { adminEmployeesApi } from "@/lib/admin-employees-api";
import { adminPosApi } from "@/lib/admin-pos-api";
import { adminSettingsApi } from "@/lib/admin-settings-api";
import type { Employee, PosExchangeInput, PosSale, PosSaleInput } from "@/lib/admin-types";
import type { DesktopUpdateManifest } from "@/lib/desktop-bridge";
import { applySaleToCachedStock, findOfflineReceipt, getPosDeviceKey, loadPosCache, loadOfflineReceipts, loadQueuedExchanges, loadQueuedRefunds, loadPosSyncState, loadQueuedSales, patchPosSyncState, persistOfflineExchange, persistOfflineSale, persistOfflineRefund, type PosRefundQueueItem, rememberReceipt, removeQueuedExchange, removeQueuedRefund, removeQueuedSale, savePosCache, type PosSyncState } from "@/lib/pos-local";
import { getDesktopBridge } from "@/lib/desktop-bridge";
import { formatPrice } from "@/lib/format";
import { buildSaleChoices, matchSaleChoices, type SaleChoice } from "@/lib/pos-catalog";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { syncApi } from "@/lib/sync-api";
import { ActionButton, EmptyState, Field, Modal, PageHeader, SelectField, StatusPill } from "@/components/admin/primitives";
import { PosReceipt } from "@/components/pos/PosReceipt";
import { PrinterProfilesModal } from "@/components/pos/PrinterProfilesModal";

export const Route = createFileRoute("/pos")({
  component: PosTerminal,
});

type CartLine = SaleChoice & {
  qty: number;
  employeeId: string;
};

// Cash register scanner audio feedback using Web Audio API
const playScanBeep = (type: "success" | "error" = "success") => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    osc.onended = () => { void ctx.close(); };
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.07);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch {
    // Ignore audio context autoplay restrictions
  }
};

type PosQuerySource = "live" | "cache";

const paymentOptions = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "EasyPaisa" },
  { value: "bank_transfer", label: "Bank transfer" },
];

const queuedJobCount = () => loadQueuedSales().length + loadQueuedRefunds().length + loadQueuedExchanges().length;

function PosTerminal() {
  const { user, isPending } = useProtectedUser({ role: ["admin", "manager", "staff"] });
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [visibleChoiceCount, setVisibleChoiceCount] = useState(12);
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
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
  const [lastUpdateCheckAt, setLastUpdateCheckAt] = useState<number | null>(null);
  const [refundReason, setRefundReason] = useState("Customer return");
  const [refundNote, setRefundNote] = useState("");
  const [refundQtys, setRefundQtys] = useState<Record<string, number>>({});
  const [exchangeSource, setExchangeSource] = useState<PosSale | null>(null);
  const [exchangeReturns, setExchangeReturns] = useState<Array<{ saleItemId: string; qty: number }>>([]);
  const [queueCount, setQueueCount] = useState(0);
  const [offlineMode, setOfflineMode] = useState(false);
  const [bootstrapError, setBootstrapError] = useState("");
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const [isRefreshingCatalog, setIsRefreshingCatalog] = useState(false);
  const [showPrinterProfiles, setShowPrinterProfiles] = useState(false);
  const bootstrapInFlight = useRef(false);
  const [initialCache] = useState(() => loadPosCache());
  const deviceKey = useMemo(() => getPosDeviceKey(), []);
  const [syncState, setSyncState] = useState<PosSyncState>(
    () =>
      loadPosSyncState() ?? {
        deviceKey,
        lastCursor: null,
        lastBootstrapAt: null,
        lastSyncAttemptAt: null,
        lastSuccessfulSyncAt: null,
        lastSyncError: "",
        retryCount: 0,
        failedJobs: 0,
        queueSize: queuedJobCount(),
      },
  );
  const canLoadPos = !isPending && Boolean(user && ["admin", "manager", "staff"].includes(user.role));
  const desktopBridge = getDesktopBridge();
  const desktopContext = desktopBridge?.getDesktopContext() ?? null;

  const openReceiptByIdentifier = async () => {
    const identifier = receiptLookup.trim();
    if (!identifier) {
      toast.error("Enter an invoice number, receipt ID, or sale number");
      return;
    }

    const local = findOfflineReceipt(identifier);
    if (local) {
      setReceipt(local);
      return;
    }

    try {
      const response = await adminPosApi.findPosSale(identifier);
      rememberReceipt(response.sale);
      setStoredReceipts(loadOfflineReceipts());
      setReceipt(response.sale);
    } catch (error) {
      toast.error(getErrorMessage(error, "Invoice not found"));
    }
  };

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

  const products = useMemo(() => (productsQuery.data?.products ?? []).filter((product) => product.isActive !== false), [productsQuery.data]);
  const employees = useMemo(() => (employeesQuery.data?.employees ?? []).filter((employee) => employee.status === "active"), [employeesQuery.data]);
  const settings = settingsQuery.data?.settings ?? null;

  const syncQueuedSales = async () => {
    const queued = loadQueuedSales();
    const queuedRefunds = loadQueuedRefunds();
    const queuedExchanges = loadQueuedExchanges();
    const attemptedAt = Date.now();
    if (queued.length === 0 && queuedRefunds.length === 0 && queuedExchanges.length === 0) {
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

    for (const exchange of queuedExchanges) {
      try {
        await adminPosApi.exchangePosSale(exchange.saleNumber, exchange);
        removeQueuedExchange(exchange.jobKey);
        await syncApi.pushSyncEvents({
          deviceKey,
          cursor: syncState.lastCursor ?? undefined,
          jobs: [{ jobKey: exchange.jobKey, direction: "push", entityType: "pos-exchange", entityId: exchange.saleNumber, payload: exchange, status: "synced" }],
        });
        synced += 1;
      } catch (error) {
        failed += 1;
        lastError = getErrorMessage(error, "Unable to sync queued exchange");
      }
    }

    const remaining = queuedJobCount();
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
      await Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.admin.posSales }), queryClient.invalidateQueries({ queryKey: queryKeys.admin.inventorySnapshot }), queryClient.invalidateQueries({ queryKey: queryKeys.admin.inventoryLedger }), queryClient.invalidateQueries({ queryKey: queryKeys.admin.commissions }), queryClient.invalidateQueries({ queryKey: queryKeys.pos.products }), queryClient.invalidateQueries({ queryKey: queryKeys.admin.products })]);
      toast.success(`Synced ${synced} queued item${synced === 1 ? "" : "s"}`);
    }
  };

  const checkDesktopUpdate = async (showFeedback = false) => {
    if (!desktopBridge || !desktopContext) {
      return;
    }

    try {
      setIsCheckingUpdate(true);
      setUpdateMessage("Checking the live release channel...");
      const update = await desktopBridge.checkForUpdates({
        deviceKey,
        currentVersion: desktopContext.appVersion,
      });
      setDesktopUpdate(update);
      setLastUpdateCheckAt(Date.now());
      setUpdateMessage(
        update.available
          ? `Version ${update.latestVersion} is ready to install.`
          : `You are up to date on version ${desktopContext.appVersion}.`,
      );
      if (showFeedback) {
        toast.success(update.available ? `Desktop update ${update.latestVersion} is available` : "Desktop app is up to date");
      }
    } catch (error) {
      const message = getErrorMessage(error, "Unable to check for desktop updates");
      setUpdateMessage(message);
      if (showFeedback) {
        toast.error(message);
      }
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  useEffect(() => {
    const bootstrapPos = async () => {
      if (bootstrapInFlight.current) return;
      bootstrapInFlight.current = true;
      setIsRefreshingCatalog(true);
      try {
        setBootstrapError("");
        if (queuedJobCount() > 0) {
          await syncQueuedSales();
          if (queuedJobCount() > 0) {
            setOfflineMode(true);
            setBootstrapError("Unable to sync queued bills and refunds. Local stock has been preserved; retry sync when connected.");
            return;
          }
        }
        if (desktopContext) {
          await syncApi.registerDevice({
            deviceKey,
            name: desktopContext.appName,
            notes: `Windows desktop ${desktopContext.appVersion}`,
          });
        }
        const bootstrap = await syncApi.syncBootstrap(deviceKey, syncState.lastCursor ?? undefined);
        if (queuedJobCount() > 0) {
          setOfflineMode(true);
          setBootstrapError("Local bills are awaiting sync. Cached stock has been preserved.");
          return;
        }
        const nextCache = {
          products: bootstrap.products,
          employees: bootstrap.employees,
          settings: bootstrap.settings,
          updatedAt: Date.now(),
        };
        savePosCache(nextCache);
        queryClient.setQueryData(queryKeys.pos.products, {
          products: bootstrap.products,
          source: "live" as PosQuerySource,
        });
        queryClient.setQueryData(queryKeys.pos.employees, {
          employees: bootstrap.employees,
          source: "live" as PosQuerySource,
        });
        queryClient.setQueryData(queryKeys.pos.settings, {
          settings: bootstrap.settings,
          source: "live" as PosQuerySource,
        });
        setOfflineMode(false);
        updateSyncState({
          lastCursor: bootstrap.cursor,
          lastBootstrapAt: Date.now(),
          lastSyncError: "",
          queueSize: queuedJobCount(),
        });
        void syncQueuedSales();
      } catch (error) {
        const message = getErrorMessage(error, "Unable to reach sync bootstrap");
        setOfflineMode(true);
        setBootstrapError(message);
        updateSyncState({
          lastSyncAttemptAt: Date.now(),
          lastSyncError: message,
          queueSize: queuedJobCount(),
        });
      } finally {
        bootstrapInFlight.current = false;
        setIsRefreshingCatalog(false);
        setQueueCount(queuedJobCount());
        setStoredReceipts(loadOfflineReceipts());
        if (desktopBridge) {
          void checkDesktopUpdate();
        }
      }
    };

    if (canLoadPos) {
      void bootstrapPos();
    }
    // Device/bootstrap changes are the intended triggers; queue helpers use the
    // latest persisted queue state internally and must not restart bootstrap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrapAttempt, canLoadPos, deviceKey]);

  useEffect(() => {
    if (!canLoadPos) return;
    const refresh = () => {
      if (navigator.onLine && document.visibilityState === "visible" && !bootstrapInFlight.current) {
        setBootstrapAttempt((current) => current + 1);
      }
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      window.clearInterval(timer);
    };
  }, [canLoadPos]);

  const installDesktopUpdate = async () => {
    const bridge = getDesktopBridge();
    if (!bridge || !desktopUpdate?.available || !desktopUpdate.windows?.installerUrl) {
      return;
    }

    try {
      setIsInstallingUpdate(true);
      await bridge.installUpdate({
        installerUrl: desktopUpdate.windows.installerUrl,
        expectedSha256: desktopUpdate.windows.sha256,
        expectedSize: desktopUpdate.windows.size,
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

    const usingCachedSource = productsQuery.data?.source === "cache" || employeesQuery.data?.source === "cache" || settingsQuery.data?.source === "cache";

    setOfflineMode(usingCachedSource);
  }, [canLoadPos, employeesQuery.data, productsQuery.data, settingsQuery.data]);

  useEffect(() => {
    setRefundQtys({});
    setRefundReason("Customer return");
    setRefundNote("");
  }, [receipt?.saleNumber]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const catalogReady = Boolean(settings);

  // Auto-focus scan input on load
  useEffect(() => {
    if (catalogReady) searchInputRef.current?.focus();
  }, [catalogReady]);

  const choices = useMemo(() => buildSaleChoices(products), [products]);

  const brandOptions = useMemo(() => Array.from(new Set(choices.map((choice) => choice.brand).filter(Boolean))).sort((left, right) => left.localeCompare(right)), [choices]);
  const categoryOptions = useMemo(() => Array.from(new Set(choices.map((choice) => choice.category).filter(Boolean))).sort((left, right) => left.localeCompare(right)), [choices]);

  const filteredChoices = useMemo(() => {
    return matchSaleChoices(search, choices)
      .filter((choice) => {
        if (brandFilter && choice.brand !== brandFilter) {
          return false;
        }

        if (categoryFilter && choice.category !== categoryFilter) {
          return false;
        }

        return true;
      })
      .sort((left, right) => Number(right.stock > 0) - Number(left.stock > 0));
  }, [brandFilter, categoryFilter, choices, search]);

  const subtotal = cart.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);

  const addChoice = useCallback((choice: SaleChoice) => {
    if (choice.stock <= 0) {
      playScanBeep("error");
      toast.error(`Out of stock: ${choice.label} (${choice.subtitle || "Standard"})`);
      return;
    }

    setCart((current) => {
      const existing = current.find((entry) => entry.productId === choice.productId && entry.variantId === choice.variantId);
      if (existing) {
        if (existing.qty >= choice.stock) {
          playScanBeep("error");
          toast.warning(`Maximum available stock reached (${choice.stock} pcs on hand)`);
          return current;
        }
        playScanBeep("success");
        toast.success(`Incremented: ${choice.label} (Qty: ${existing.qty + 1})`);
        return current.map((entry) => (entry.productId === choice.productId && entry.variantId === choice.variantId ? { ...entry, qty: entry.qty + 1 } : entry));
      }

      playScanBeep("success");
      toast.success(`Added: ${choice.label} ${choice.size ? `· Size ${choice.size}` : ""}`);
      return [...current, { ...choice, qty: 1, employeeId: "" }];
    });
    setSearch("");
    searchInputRef.current?.focus();
  }, []);

  const handleScanOrSubmit = useCallback((codeToSearch: string) => {
    const target = codeToSearch.trim();
    if (!target) return;
    if (/^BI-[0-9A-Z]{4}$/i.test(target)) {
      setReceiptLookup(target.toUpperCase());
      void adminPosApi.findPosSale(target).then((response) => {
        rememberReceipt(response.sale);
        setStoredReceipts(loadOfflineReceipts());
        setReceipt(response.sale);
        playScanBeep("success");
      }).catch((error) => {
        playScanBeep("error");
        toast.error(getErrorMessage(error, "Invoice not found"));
      });
      return;
    }
    if (isRefreshingCatalog && choices.length === 0) {
      toast.info("Catalog is loading. Please scan again when products appear.");
      return;
    }
    const matches = matchSaleChoices(target, choices);
    if (matches.length === 1) {
      addChoice(matches[0]);
    } else {
      setSearch(target);
      setBrandFilter("");
      setCategoryFilter("");
      setVisibleChoiceCount(12);
      if (matches.length > 1) {
        toast.info("Choose the correct product, size and color from the results.");
      } else {
        playScanBeep("error");
        toast.error(`No matching product in the loaded catalog. Refresh products and try again.`);
      }
    }
    searchInputRef.current?.focus();
  }, [addChoice, choices, isRefreshingCatalog]);

  const submitScannerCode = useEffectEvent(handleScanOrSubmit);

  // Global hardware presentation scanner listener (Honeywell Orbit MS7120)
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);

      // Do not intercept human typing if user is actively filling customer forms or select dropdowns
      if (isInput) {
        buffer = "";
        return;
      }

      const currentTime = Date.now();
      const isHardwareSpeed = currentTime - lastKeyTime < 60; // Hardware laser scanner burst
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (buffer.length >= 2 && isHardwareSpeed) {
          e.preventDefault();
          submitScannerCode(buffer);
        }
        buffer = "";
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (isHardwareSpeed || buffer.length === 0) {
          buffer += e.key;
        } else {
          buffer = e.key;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    setQueueCount(queuedJobCount());
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
      setQueueCount(queuedJobCount());
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
      await Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.admin.posSales }), queryClient.invalidateQueries({ queryKey: queryKeys.admin.inventorySnapshot }), queryClient.invalidateQueries({ queryKey: queryKeys.admin.inventoryLedger }), queryClient.invalidateQueries({ queryKey: queryKeys.admin.commissions }), queryClient.invalidateQueries({ queryKey: queryKeys.pos.products }), queryClient.invalidateQueries({ queryKey: queryKeys.admin.products })]);
      toast.success("Refund processed");
      setBootstrapAttempt((current) => current + 1);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to process refund"));
    }
  };

  const startExchange = () => {
    if (!receipt) return;
    const returns = receipt.items
      .map((line) => ({ saleItemId: line.id, productId: line.productId, variantId: line.variantId, qty: Math.max(0, refundQtys[line.id] ?? 0), max: line.qty - line.refundedQty }))
      .filter((entry) => entry.qty > 0 && entry.qty <= entry.max)
      .map(({ saleItemId, productId, variantId, qty }) => ({ saleItemId, productId, variantId, qty }));
    if (returns.length === 0) {
      toast.error("Enter the quantity to exchange beside at least one item");
      return;
    }
    setExchangeSource(receipt);
    setExchangeReturns(returns);
    setCustomerName(receipt.customerName);
    setCustomerPhone(receipt.customerPhone);
    setCustomerEmail(receipt.customerEmail);
    setCart([]);
    setReceipt(null);
    toast.info("Select the replacement products, then finalize the exchange");
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

    if (exchangeSource) {
      const jobKey = `exchange-${exchangeSource.saleNumber}-${crypto.randomUUID()}`;
      const exchange: PosExchangeInput = {
        jobKey,
        idempotencyKey: jobKey,
        saleNumber: exchangeSource.saleNumber,
        reason: refundReason.trim() || "Customer exchange",
        note: notes,
        paymentMethod,
        deviceKey,
        deviceName: "Shop POS",
        returns: exchangeReturns,
        replacements: payload.lines,
      };
      try {
        const replacement = offlineMode || !navigator.onLine
          ? persistOfflineExchange({ exchange, employees, settings })
          : (await adminPosApi.exchangePosSale(exchange.saleNumber, exchange)).sale;
        if (!replacement) throw new Error("The original receipt is not available offline");
        rememberReceipt(replacement);
        setReceipt(replacement);
        setStoredReceipts(loadOfflineReceipts());
        setCart([]);
        setExchangeSource(null);
        setExchangeReturns([]);
        setNotes("");
        setQueueCount(queuedJobCount());
        toast.success(offlineMode || !navigator.onLine ? "Exchange saved locally and queued" : "Exchange completed");
        setBootstrapAttempt((current) => current + 1);
      } catch (error) {
        toast.error(getErrorMessage(error, "Unable to complete exchange"));
      }
      return;
    }

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
      setBootstrapAttempt((current) => current + 1);
      setOfflineMode(false);
      await Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.admin.posSales }), queryClient.invalidateQueries({ queryKey: queryKeys.admin.inventorySnapshot }), queryClient.invalidateQueries({ queryKey: queryKeys.admin.inventoryLedger }), queryClient.invalidateQueries({ queryKey: queryKeys.admin.commissions }), queryClient.invalidateQueries({ queryKey: queryKeys.pos.products }), queryClient.invalidateQueries({ queryKey: queryKeys.admin.products })]);
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
            <div className="inline-flex items-center gap-2 border border-border px-3 py-2 text-xs uppercase tracking-widest">Queue {queueCount}</div>
            <ActionButton onClick={() => setBootstrapAttempt((current) => current + 1)} variant="ghost" disabled={isRefreshingCatalog}>
              <RefreshCcw className="h-3.5 w-3.5" /> Sync queued
            </ActionButton>
            <ActionButton onClick={() => setBootstrapAttempt((current) => current + 1)} variant="ghost" disabled={isRefreshingCatalog}>
              <RefreshCcw className={`h-3.5 w-3.5 ${isRefreshingCatalog ? "animate-spin" : ""}`} />
              {isRefreshingCatalog ? "Refreshing products..." : "Refresh products"}
            </ActionButton>
            <Link to="/admin" className="inline-flex items-center gap-2 border border-border px-4 py-2.5 text-xs uppercase tracking-widest hover:bg-secondary">
              <ArrowLeft className="h-3.5 w-3.5" /> Management dashboard
            </Link>
          </>
        }
      />

      {exchangeSource && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border border-amber-500 bg-amber-50 p-4 text-sm text-black">
          <div>
            <strong>Exchange in progress:</strong> {exchangeSource.receipt?.lookupCode || exchangeSource.receipt?.invoiceNumber || exchangeSource.saleNumber}. Add replacement products and finalize the bill.
          </div>
          <ActionButton variant="ghost" onClick={() => { setExchangeSource(null); setExchangeReturns([]); setCart([]); }}>Cancel exchange</ActionButton>
        </div>
      )}

      {!settings || productsQuery.isLoading || employeesQuery.isLoading || settingsQuery.isLoading ? (
        <div className="space-y-4">
          {bootstrapError ? (
            <EmptyState
              title="POS data is unavailable"
              hint={`${bootstrapError}. No local catalog cache is available, so billing is disabled to protect inventory accuracy.`}
              cta={
                <ActionButton variant="ghost" onClick={() => setBootstrapAttempt((current) => current + 1)}>
                  <RefreshCcw className="mr-2 h-3.5 w-3.5" /> Retry POS sync
                </ActionButton>
              }
            />
          ) : (
            <EmptyState title="Loading POS data" hint="Trying live data first, then falling back to the local cache." />
          )}
          {desktopContext && (
            <div className="border border-border p-5">
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Desktop updates</div>
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                <div>Installed: <span className="font-medium text-foreground">{desktopContext.appVersion}</span></div>
                <div>Latest: <span className="font-medium text-foreground">{desktopUpdate?.latestVersion ?? "Check required"}</span></div>
              </div>
              {updateMessage && <div className="mt-2 text-sm text-muted-foreground">{updateMessage}</div>}
              <div className="mt-4">
                <ActionButton variant="ghost" onClick={() => void checkDesktopUpdate(true)} disabled={isCheckingUpdate || isInstallingUpdate}>
                  <RefreshCcw className={`mr-2 h-3.5 w-3.5 ${isCheckingUpdate ? "animate-spin" : ""}`} />
                  {isCheckingUpdate ? "Checking..." : "Check now"}
                </ActionButton>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-5">
            <div className="border border-border p-4">
              <label htmlFor="pos-search" className="mb-2 block text-xs uppercase tracking-[0.3em] text-muted-foreground">Scan or search</label>
              <p className="mb-3 text-sm text-muted-foreground" role="status">{products.length} products loaded{offlineMode ? " from offline cache" : ""}. Scan the striped barcode; Orbit MS7120 does not read QR codes.</p>
              {bootstrapError && <p role="alert" className="mb-3 text-sm text-destructive">{bootstrapError}</p>}
              <div className="relative">
                <ScanLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="pos-search"
                  ref={searchInputRef}
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setVisibleChoiceCount(12); }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.stopPropagation();
                      handleScanOrSubmit(event.currentTarget.value);
                    }
                  }}
                  placeholder="Scan barcode with Honeywell Orbit or search by name / SKU..."
                  className="w-full border border-border bg-background py-3 pl-10 pr-3 text-sm outline-none focus:border-foreground"
                />
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <select aria-label="Filter POS brands" value={brandFilter} onChange={(event) => { setBrandFilter(event.target.value); setVisibleChoiceCount(12); }} className="border border-border bg-background px-3 py-2 text-sm">
                  <option value="">All brands</option>
                  {brandOptions.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
                <select aria-label="Filter POS categories" value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setVisibleChoiceCount(12); }} className="border border-border bg-background px-3 py-2 text-sm">
                  <option value="">All categories</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              {filteredChoices.length > 0 && (
                <div className="mt-3 grid max-h-80 gap-2 overflow-y-auto" aria-label="POS product results">
                  {filteredChoices.slice(0, visibleChoiceCount).map((choice) => (
                    <button key={choice.key} onClick={() => addChoice(choice)} className="flex items-center justify-between border border-border px-3 py-3 text-left hover:bg-secondary">
                      <div>
                        <div className="font-medium">{choice.label}</div>
                        <div className="text-xs text-muted-foreground">{choice.subtitle || choice.barcode || choice.qrCode}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatPrice(choice.unitPrice)}</div>
                        <div className={`text-xs ${choice.stock > 0 ? "text-muted-foreground" : "text-destructive"}`}>{choice.stock > 0 ? `${choice.stock} in stock` : "Out of stock"}</div>
                      </div>
                    </button>
                  ))}
                  {filteredChoices.length > visibleChoiceCount && <ActionButton variant="ghost" onClick={() => setVisibleChoiceCount((current) => current + 12)}>Show more products ({filteredChoices.length - visibleChoiceCount} remaining)</ActionButton>}
                </div>
              )}
              {filteredChoices.length === 0 && <p role="status" className="mt-3 text-sm text-muted-foreground">{choices.length ? "No matching products. Clear the filters or refresh products." : "No active products are available. Refresh products or check the catalog in Management."}</p>}
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
                      <td className="p-6 text-center text-muted-foreground" colSpan={6}>
                        No items added yet.
                      </td>
                    </tr>
                  ) : (
                    cart.map((line) => (
                      <tr key={line.key} className="border-t border-border">
                        <td className="p-3">
                          <div className="font-medium">{line.label}</div>
                          <div className="text-xs text-muted-foreground">{[line.subtitle, line.barcode || line.qrCode].filter(Boolean).join(" | ")}</div>
                        </td>
                        <td className="p-3 min-w-[180px]">
                          <select value={line.employeeId} onChange={(event) => setCart((current) => current.map((entry) => (entry.key === line.key ? { ...entry, employeeId: event.target.value } : entry)))} className="w-full border border-border bg-background px-2 py-2 text-sm">
                            <option value="">No attribution</option>
                            {employees.map((employee) => (
                              <option key={employee.id} value={employee.id}>
                                {employee.name}
                              </option>
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
                                  entry.key === line.key
                                    ? {
                                        ...entry,
                                        qty: Math.max(1, Number(event.target.value) || 1),
                                      }
                                    : entry,
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
                                  entry.key === line.key
                                    ? {
                                        ...entry,
                                        unitPrice: Math.max(0, Number(event.target.value) || 0),
                                      }
                                    : entry,
                                ),
                              )
                            }
                            className="w-24 border border-border bg-background px-2 py-2 text-sm"
                          />
                        </td>
                        <td className="p-3 font-semibold">{formatPrice(line.unitPrice * line.qty)}</td>
                        <td className="p-3">
                          <button onClick={() => setCart((current) => current.filter((entry) => entry.key !== line.key))} className="p-2 hover:bg-sale hover:text-primary-foreground">
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
                <div>
                  {cart.length} item line{cart.length === 1 ? "" : "s"} in cart
                </div>
                <div>
                  {queueCount} queued offline sale{queueCount === 1 ? "" : "s"}
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <ActionButton onClick={() => void checkout()}>Finalize bill</ActionButton>
                <ActionButton variant="ghost" onClick={() => setCart([])}>
                  Clear cart
                </ActionButton>
              </div>
            </div>

            <div className="border border-border p-5">
              <div className="mb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">Sync diagnostics</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>
                  Device: <span className="font-medium text-foreground">{deviceKey}</span>
                </div>
                <div>
                  Last bootstrap: <span className="text-foreground">{syncState.lastBootstrapAt ? new Date(syncState.lastBootstrapAt).toLocaleString() : "Never"}</span>
                </div>
                <div>
                  Last sync attempt: <span className="text-foreground">{syncState.lastSyncAttemptAt ? new Date(syncState.lastSyncAttemptAt).toLocaleString() : "Never"}</span>
                </div>
                <div>
                  Last successful sync: <span className="text-foreground">{syncState.lastSuccessfulSyncAt ? new Date(syncState.lastSuccessfulSyncAt).toLocaleString() : "Never"}</span>
                </div>
                <div>
                  Cursor: <span className="font-mono text-foreground">{syncState.lastCursor ?? "Not synced yet"}</span>
                </div>
                <div>
                  Backlog: <span className="text-foreground">{syncState.queueSize}</span>
                </div>
                <div>
                  Retry count: <span className="text-foreground">{syncState.retryCount}</span>
                </div>
                <div>
                  Failed syncs: <span className="text-foreground">{syncState.failedJobs}</span>
                </div>
                {syncState.lastSyncError && <div className="text-sale">Last error: {syncState.lastSyncError}</div>}
              </div>
            </div>

            {desktopContext && (
              <div className="border border-border p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Desktop updates</div>
                    <div className="mt-2 text-lg font-semibold">Release channel</div>
                  </div>
                  <StatusPill status={desktopUpdate?.available ? "pending" : "synced"} />
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>
                    Installed version: <span className="font-medium text-foreground">{desktopContext.appVersion}</span>
                  </div>
                  <div>
                    Latest version: <span className="font-medium text-foreground">{desktopUpdate?.latestVersion ?? "Check required"}</span>
                  </div>
                  <div>
                    Cloud: <span className="break-all text-foreground">{desktopContext.cloudOrigin}</span>
                  </div>
                  <div>
                    Last checked: <span className="text-foreground">{lastUpdateCheckAt ? new Date(lastUpdateCheckAt).toLocaleString() : "Not checked yet"}</span>
                  </div>
                  {updateMessage && <div className={desktopUpdate?.available ? "font-medium text-foreground" : ""}>{updateMessage}</div>}
                  {desktopUpdate?.notes && <div>Release notes: {desktopUpdate.notes}</div>}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <ActionButton variant="ghost" onClick={() => setShowPrinterProfiles(true)}>Change printer presets</ActionButton>
                  <ActionButton variant="ghost" onClick={() => void checkDesktopUpdate(true)} disabled={isCheckingUpdate || isInstallingUpdate}>
                    <RefreshCcw className={`mr-2 h-3.5 w-3.5 ${isCheckingUpdate ? "animate-spin" : ""}`} />
                    {isCheckingUpdate ? "Checking..." : "Check now"}
                  </ActionButton>
                  {desktopUpdate?.available && desktopUpdate.windows && (
                    <ActionButton onClick={() => void installDesktopUpdate()} disabled={isInstallingUpdate || isCheckingUpdate}>
                      {isInstallingUpdate ? "Launching installer..." : `Install ${desktopUpdate.latestVersion}`}
                    </ActionButton>
                  )}
                </div>
              </div>
            )}

            <div className="border border-border p-5">
              <div className="mb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">Receipt lookup</div>
              <div className="flex gap-3">
                <input
                  value={receiptLookup}
                  onChange={(event) => setReceiptLookup(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void openReceiptByIdentifier();
                  }}
                  placeholder="Invoice number, receipt ID, or scan barcode"
                  className="flex-1 border border-border bg-background px-3 py-2 text-sm"
                />
                <ActionButton
                  variant="ghost"
                  onClick={() => void openReceiptByIdentifier()}
                >
                  Open
                </ActionButton>
              </div>
              <div className="mt-3 space-y-2">
                {storedReceipts.slice(0, 5).map((sale) => (
                  <button key={sale.saleNumber} onClick={() => setReceipt(sale)} className="flex w-full items-center justify-between border border-border px-3 py-2 text-left hover:bg-secondary">
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
              <ActionButton variant="ghost" onClick={() => setReceipt(null)}>
                Close
              </ActionButton>
              <ActionButton
                onClick={async () => {
                  let printableReceipt = receipt;
                  if (receipt.syncedStatus === "synced") {
                    try {
                      printableReceipt = (await adminPosApi.recordReprint(receipt.saleNumber)).sale;
                      setReceipt(printableReceipt);
                    } catch {
                      // Printing remains available if audit tracking is temporarily offline.
                    }
                  }
                  const bridge = getDesktopBridge();
                  if (bridge) {
                    if (!bridge.getPrinterProfiles().receipt?.printerName) {
                      setShowPrinterProfiles(true);
                      toast.error("Select and save the receipt printer first");
                      return;
                    }
                    try {
                      await bridge.printReceipt({ sale: printableReceipt, settings });
                      toast.success("Receipt sent to printer");
                    } catch (error) {
                      toast.error(getErrorMessage(error, "Unable to print receipt"));
                    }
                    return;
                  }

                  localStorage.setItem("bilal_rms_receipt_layout", JSON.stringify({ rollWidthMm: 72, contentWidthMm: 66, paddingMm: 3, orientation: "portrait" }));
                  window.print();
                }}
              >
                <Printer className="h-3.5 w-3.5" /> Print
              </ActionButton>
            </>
          }
        >
          <div className="mx-auto max-w-xl space-y-4">
            <div className="border border-border bg-white p-3">
              <PosReceipt sale={receipt} settings={settings} />
            </div>
            {receipt.status === "finalized" && <div className="border border-border p-4">
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
                  <div className="flex flex-wrap justify-end gap-2">
                    <ActionButton variant="ghost" onClick={startExchange}>Exchange selected products</ActionButton>
                    <ActionButton variant="ghost" onClick={() => void processRefund()}>Process refund</ActionButton>
                  </div>
                </div>
              </div>
            </div>}
          </div>
        </Modal>
      )}
      {showPrinterProfiles && <PrinterProfilesModal onClose={() => setShowPrinterProfiles(false)} />}
    </div>
  );
}
