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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{eyebrow}</div>
        )}
        <h2 className="display text-2xl md:text-3xl">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  delta,
  tone,
}: {
  label: string;
  value: string | number;
  delta?: string;
  tone?: "up" | "down" | "flat";
}) {
  const toneClass = tone === "up" ? "bg-accent text-accent-foreground" : tone === "down" ? "bg-sale text-primary-foreground" : "bg-secondary";
  return (
    <div className="border border-border p-5">
      <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label}</div>
      <div className="display mt-2 text-2xl">{value}</div>
      {delta && <span className={`mt-3 inline-block px-2 py-1 text-[10px] uppercase tracking-widest ${toneClass}`}>{delta}</span>}
    </div>
  );
}

export function EmptyState({ title, hint, cta }: { title: string; hint?: string; cta?: ReactNode }) {
  return (
    <div className="bg-secondary p-10 text-center">
      <div className="display mb-2 text-lg">{title}</div>
      {hint && <p className="mb-4 text-sm text-muted-foreground">{hint}</p>}
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
  return <span className={`inline-block px-2 py-1 text-[10px] uppercase tracking-widest ${cls}`}>{status}</span>;
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
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {onSearch !== undefined && (
        <div className="relative max-w-md min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search ?? ""}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search..."
            className="w-full border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-foreground"
          />
        </div>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-2">{right}</div>
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-0 md:p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[95vh] w-full overflow-y-auto bg-background ${wide ? "md:max-w-3xl" : "md:max-w-lg"}`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background p-5">
          <h3 className="display text-xl">{title}</h3>
          <button type="button" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-background p-5">{footer}</div>}
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
      <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
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

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Tabs({
  items,
  active,
  onChange,
}: {
  items: { key: string; label: string }[];
  active: string;
  onChange: (k: string) => void;
}) {
  return (
    <div className="mb-6 flex gap-4 overflow-x-auto border-b border-border">
      {items.map((item) => {
        const on = item.key === active;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={`-mb-px whitespace-nowrap border-b-2 pb-3 text-xs uppercase tracking-[0.2em] transition-colors ${
              on ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function BackLink({ to, label = "Back" }: { to: string; label?: string }) {
  return (
    <Link to={to} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
      {"<-"} {label}
    </Link>
  );
}

export function ActionButton({
  children,
  onClick,
  variant = "primary",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
}) {
  const base = "inline-flex items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-widest";
  const cls =
    variant === "primary"
      ? `${base} bg-primary text-primary-foreground`
      : variant === "danger"
        ? `${base} bg-sale text-primary-foreground`
        : `${base} border border-border hover:bg-secondary`;
  return (
    <button type={type} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
      <span>
        Page {page} of {pages}
      </span>
      <div className="flex gap-1">
        <button
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          className="border border-border px-3 py-2 disabled:opacity-40"
        >
          Prev
        </button>
        <button
          disabled={page === pages}
          onClick={() => onChange(page + 1)}
          className="border border-border px-3 py-2 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
