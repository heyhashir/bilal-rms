import { Link } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  action,
  description,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  description?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">{eyebrow}</div>
        )}
        <h2 className="display text-2xl md:text-3xl">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, delta, tone }: { label: string; value: string | number; delta?: string; tone?: "up" | "down" | "flat" }) {
  const toneClass = tone === "up" ? "text-accent-foreground bg-accent" : tone === "down" ? "text-primary-foreground bg-sale" : "bg-secondary";
  return (
    <div className="border border-border p-5">
      <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label}</div>
      <div className="display text-2xl mt-2">{value}</div>
      {delta && <span className={`inline-block mt-3 text-[10px] uppercase tracking-widest px-2 py-1 ${toneClass}`}>{delta}</span>}
    </div>
  );
}

export function EmptyState({ title, hint, cta }: { title: string; hint?: string; cta?: ReactNode }) {
  return (
    <div className="bg-secondary p-10 text-center">
      <div className="display text-lg mb-2">{title}</div>
      {hint && <p className="text-sm text-muted-foreground mb-4">{hint}</p>}
      {cta}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-accent text-accent-foreground",
    inactive: "bg-secondary text-muted-foreground",
    pending: "bg-secondary",
    processing: "bg-secondary",
    shipped: "bg-secondary",
    delivered: "bg-accent text-accent-foreground",
    cancelled: "bg-sale text-primary-foreground",
    refunded: "bg-sale/80 text-primary-foreground",
    approved: "bg-accent text-accent-foreground",
    rejected: "bg-sale text-primary-foreground",
    requested: "bg-secondary",
    draft: "bg-secondary",
    ordered: "bg-secondary",
    received: "bg-accent text-accent-foreground",
  };
  const cls = map[status.toLowerCase()] ?? "bg-secondary";
  return <span className={`inline-block text-[10px] uppercase tracking-widest px-2 py-1 ${cls}`}>{status}</span>;
}

export function Toolbar({
  search,
  onSearch,
  right,
}: {
  search?: string;
  onSearch?: (v: string) => void;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      {onSearch !== undefined && (
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search ?? ""}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search…"
            className="w-full pl-9 pr-3 py-2.5 border border-border bg-background text-sm outline-none focus:border-foreground"
          />
        </div>
      )}
      <div className="flex items-center gap-2 ml-auto flex-wrap">{right}</div>
    </div>
  );
}

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-0 md:p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-background w-full ${wide ? "md:max-w-3xl" : "md:max-w-lg"} max-h-[95vh] overflow-y-auto`}
      >
        <div className="flex justify-between items-center p-5 border-b border-border sticky top-0 bg-background z-10">
          <h3 className="display text-xl">{title}</h3>
          <button type="button" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="p-5 border-t border-border sticky bottom-0 bg-background flex gap-3 justify-end">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  textarea,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  textarea?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
      ) : (
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
      )}
    </label>
  );
}

export function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function Tabs({ items, active, onChange }: { items: { key: string; label: string }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="border-b border-border mb-6 flex gap-4 overflow-x-auto">
      {items.map((i) => {
        const on = i.key === active;
        return (
          <button
            key={i.key}
            onClick={() => onChange(i.key)}
            className={`whitespace-nowrap pb-3 -mb-px text-xs uppercase tracking-[0.2em] border-b-2 transition-colors ${
              on ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {i.label}
          </button>
        );
      })}
    </div>
  );
}

export function BackLink({ to, label = "Back" }: { to: string; label?: string }) {
  return (
    <Link to={to} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
      ← {label}
    </Link>
  );
}

export function ActionButton({ children, onClick, variant = "primary", type = "button" }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "danger"; type?: "button" | "submit" }) {
  const base = "inline-flex items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-widest";
  const cls =
    variant === "primary" ? `${base} bg-primary text-primary-foreground` :
    variant === "danger" ? `${base} bg-sale text-primary-foreground` :
    `${base} border border-border hover:bg-secondary`;
  return <button type={type} onClick={onClick} className={cls}>{children}</button>;
}

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 text-xs uppercase tracking-widest text-muted-foreground">
      <span>Page {page} of {pages}</span>
      <div className="flex gap-1">
        <button
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          className="px-3 py-2 border border-border disabled:opacity-40"
        >Prev</button>
        <button
          disabled={page === pages}
          onClick={() => onChange(page + 1)}
          className="px-3 py-2 border border-border disabled:opacity-40"
        >Next</button>
      </div>
    </div>
  );
}
