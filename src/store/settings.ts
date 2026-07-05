import { create } from "zustand";
import { persist } from "zustand/middleware";
import { site as defaultSite, sizeCharts as defaultCharts } from "@/config/site";

export type SiteSettings = {
  name: string;
  tagline: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  currencySymbol: string;
  shippingFlatRate: number;
  shippingFreeAbove: number;
  instagram: string;
  facebook: string;
  tiktok: string;
  metaTitle: string;
  metaDescription: string;
  globalHashtags: string[];
};

type SettingsState = {
  settings: SiteSettings;
  update: (patch: Partial<SiteSettings>) => void;
  reset: () => void;
};

const initial: SiteSettings = {
  name: defaultSite.name,
  tagline: defaultSite.tagline,
  description: defaultSite.description,
  email: defaultSite.email,
  phone: defaultSite.phone,
  address: defaultSite.address,
  currencySymbol: defaultSite.currencySymbol,
  shippingFlatRate: defaultSite.shipping.flatRate,
  shippingFreeAbove: defaultSite.shipping.freeAbove,
  instagram: defaultSite.social.instagram,
  facebook: defaultSite.social.facebook,
  tiktok: defaultSite.social.tiktok,
  metaTitle: `${defaultSite.name} — ${defaultSite.tagline}`,
  metaDescription: defaultSite.description,
  globalHashtags: ["#bilalgarments", "#wearbold", "#madeinpakistan"],
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      settings: initial,
      update: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      reset: () => set({ settings: initial }),
    }),
    { name: "bg-settings-v1" },
  ),
);

export type SizeChartRow = { size: string; chest: string; length: string };
export type SizeChart = { key: string; label: string; rows: SizeChartRow[] };

type ChartsState = {
  charts: SizeChart[];
  upsert: (c: SizeChart) => void;
  remove: (key: string) => void;
  addRow: (key: string, row: SizeChartRow) => void;
  updateRow: (key: string, idx: number, row: SizeChartRow) => void;
  removeRow: (key: string, idx: number) => void;
};

const seedCharts: SizeChart[] = Object.entries(defaultCharts).map(([key, c]) => ({
  key,
  label: c.label,
  rows: [...c.rows],
}));

export const useSizeCharts = create<ChartsState>()(
  persist(
    (set) => ({
      charts: seedCharts,
      upsert: (c) =>
        set((s) => ({
          charts: s.charts.find((x) => x.key === c.key)
            ? s.charts.map((x) => (x.key === c.key ? c : x))
            : [...s.charts, c],
        })),
      remove: (key) => set((s) => ({ charts: s.charts.filter((c) => c.key !== key) })),
      addRow: (key, row) =>
        set((s) => ({
          charts: s.charts.map((c) => (c.key === key ? { ...c, rows: [...c.rows, row] } : c)),
        })),
      updateRow: (key, idx, row) =>
        set((s) => ({
          charts: s.charts.map((c) =>
            c.key === key ? { ...c, rows: c.rows.map((r, i) => (i === idx ? row : r)) } : c,
          ),
        })),
      removeRow: (key, idx) =>
        set((s) => ({
          charts: s.charts.map((c) =>
            c.key === key ? { ...c, rows: c.rows.filter((_, i) => i !== idx) } : c,
          ),
        })),
    }),
    { name: "bg-sizecharts-v1" },
  ),
);
