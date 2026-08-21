import { useEffect, useState } from "react";

export const DEFAULT_PKR_PER_USD = 278.0;
const CACHE_KEY = "bilal_rms_exchange_rate_usd";
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours cache

type RateCache = {
  pkrPerUsd: number;
  timestamp: number;
};

let inMemoryRate: number = DEFAULT_PKR_PER_USD;
let isFetching = false;
const listeners = new Set<(rate: number) => void>();

function notify(rate: number) {
  inMemoryRate = rate;
  listeners.forEach((cb) => cb(rate));
}

// Load cached rate on startup
if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RateCache;
      if (parsed.pkrPerUsd && Date.now() - parsed.timestamp < CACHE_DURATION_MS) {
        inMemoryRate = parsed.pkrPerUsd;
      }
    }
  } catch {
    // Ignore storage parse errors
  }
}

export async function fetchLiveExchangeRate(): Promise<number> {
  if (typeof window === "undefined") return DEFAULT_PKR_PER_USD;
  if (isFetching) return inMemoryRate;

  // Check valid cache first
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RateCache;
      if (parsed.pkrPerUsd && Date.now() - parsed.timestamp < CACHE_DURATION_MS) {
        notify(parsed.pkrPerUsd);
        return parsed.pkrPerUsd;
      }
    }
  } catch {
    // Ignore cache error
  }

  isFetching = true;
  try {
    // Primary API
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (res.ok) {
      const data = await res.json();
      const rate = Number(data?.rates?.PKR);
      if (rate && rate > 0) {
        const rounded = Math.round(rate * 100) / 100;
        localStorage.setItem(CACHE_KEY, JSON.stringify({ pkrPerUsd: rounded, timestamp: Date.now() }));
        notify(rounded);
        return rounded;
      }
    }
  } catch {
    // Fallback to secondary API
    try {
      const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
      if (res.ok) {
        const data = await res.json();
        const rate = Number(data?.rates?.PKR);
        if (rate && rate > 0) {
          const rounded = Math.round(rate * 100) / 100;
          localStorage.setItem(CACHE_KEY, JSON.stringify({ pkrPerUsd: rounded, timestamp: Date.now() }));
          notify(rounded);
          return rounded;
        }
      }
    } catch {
      // Use fallback default
    }
  } finally {
    isFetching = false;
  }

  return inMemoryRate;
}

// React Hook to access live exchange rate
export function useExchangeRate() {
  const [rate, setRate] = useState<number>(inMemoryRate);

  useEffect(() => {
    const handler = (newRate: number) => setRate(newRate);
    listeners.add(handler);
    void fetchLiveExchangeRate();
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const convertPkrToUsd = (pkrAmount: number): number => {
    if (!pkrAmount || pkrAmount <= 0) return 0;
    return pkrAmount / (rate || DEFAULT_PKR_PER_USD);
  };

  const formatUsd = (pkrAmount: number): string => {
    const usd = convertPkrToUsd(pkrAmount);
    return `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  };

  const formatUsdShort = (pkrAmount: number): string => {
    const usd = convertPkrToUsd(pkrAmount);
    return `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return {
    pkrPerUsd: rate,
    convertPkrToUsd,
    formatUsd,
    formatUsdShort,
  };
}

export function convertPkrToUsdStatic(pkrAmount: number, customRate?: number): number {
  const r = customRate || inMemoryRate || DEFAULT_PKR_PER_USD;
  return pkrAmount / r;
}

export function formatUsdStatic(pkrAmount: number, customRate?: number): string {
  const usd = convertPkrToUsdStatic(pkrAmount, customRate);
  return `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
}

export function formatUsdShortStatic(pkrAmount: number, customRate?: number): string {
  const usd = convertPkrToUsdStatic(pkrAmount, customRate);
  return `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
