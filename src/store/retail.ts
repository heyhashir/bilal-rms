import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---------- Brands ----------
export type Brand = {
  id: string;
  name: string;
  slug: string;
  country: string;
  website: string;
  status: "active" | "inactive";
  createdAt: number;
};

// ---------- Suppliers ----------
export type Supplier = {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  city: string;
  paymentTerms: string;
  status: "active" | "inactive";
  createdAt: number;
};

// ---------- Purchase Orders ----------
export type POLine = {
  productId: string;
  productName: string;
  qty: number;
  unitCost: number;
};
export type PurchaseOrder = {
  id: string;
  supplierId: string;
  supplierName: string;
  status: "draft" | "ordered" | "received" | "cancelled";
  lines: POLine[];
  total: number;
  expectedAt: number;
  createdAt: number;
  notes: string;
};

// ---------- Inventory Movements ----------
export type MovementReason =
  | "purchase"
  | "sale"
  | "adjustment"
  | "damage"
  | "return"
  | "transfer";
export type Movement = {
  id: string;
  productId: string;
  productName: string;
  qty: number; // positive = in, negative = out
  reason: MovementReason;
  reference: string; // PO id, order id, etc.
  note: string;
  createdBy: string;
  createdAt: number;
};

// ---------- Returns ----------
export type ReturnItem = {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  qty: number;
  reason: string;
  condition: "resellable" | "damaged" | "defective";
  status: "requested" | "approved" | "rejected" | "refunded";
  refundAmount: number;
  createdAt: number;
};

// ---------- Discounts & Coupons ----------
export type Discount = {
  id: string;
  name: string;
  scope: "all" | "category" | "product";
  target: string;
  type: "percent" | "flat";
  value: number;
  startAt: number;
  endAt: number;
  active: boolean;
};

export type Coupon = {
  id: string;
  code: string;
  type: "percent" | "flat";
  value: number;
  minOrder: number;
  usageLimit: number;
  used: number;
  expiresAt: number;
  active: boolean;
};

// ---------- Employees & Roles ----------
export type Employee = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: "active" | "inactive";
  joinedAt: number;
};
export type RoleDef = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
};

// ---------- CMS ----------
export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  ctaLabel: string;
  ctaLink: string;
  active: boolean;
  order: number;
};
export type Hero = {
  id: string;
  headline: string;
  eyebrow: string;
  body: string;
  image: string;
  active: boolean;
};
export type Testimonial = {
  id: string;
  author: string;
  role: string;
  quote: string;
  rating: number;
  active: boolean;
};

// ---------- Activity Log ----------
export type ActivityLog = {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAt: number;
};

// ---------- Notifications ----------
export type Notification = {
  id: string;
  title: string;
  body: string;
  level: "info" | "warning" | "success";
  read: boolean;
  createdAt: number;
};

// -------------------- Seed --------------------

const now = Date.now();
const days = (n: number) => now - n * 86400000;

const seedBrands: Brand[] = [
  { id: "b1", name: "Bilal Signature", slug: "bilal-signature", country: "Pakistan", website: "https://bilalgarments.pk", status: "active", createdAt: days(120) },
  { id: "b2", name: "Karakoram Denim", slug: "karakoram-denim", country: "Pakistan", website: "https://kdenim.pk", status: "active", createdAt: days(90) },
  { id: "b3", name: "Studio Ivory", slug: "studio-ivory", country: "Italy", website: "https://studioivory.it", status: "active", createdAt: days(60) },
  { id: "b4", name: "Northline", slug: "northline", country: "Turkey", website: "https://northline.co", status: "inactive", createdAt: days(40) },
];

const seedSuppliers: Supplier[] = [
  { id: "s1", name: "Faisalabad Textile Mills", contact: "Adnan Rauf", email: "adnan@ftmills.pk", phone: "+92 300 1112233", city: "Faisalabad", paymentTerms: "Net 30", status: "active", createdAt: days(150) },
  { id: "s2", name: "Sialkot Leather Co.", contact: "Hira Khan", email: "hira@sialkotleather.pk", phone: "+92 321 4445566", city: "Sialkot", paymentTerms: "Net 15", status: "active", createdAt: days(110) },
  { id: "s3", name: "Karachi Knits Ltd.", contact: "Bilal Ahmed", email: "bilal@kknits.pk", phone: "+92 333 7778899", city: "Karachi", paymentTerms: "Prepaid", status: "active", createdAt: days(80) },
  { id: "s4", name: "Lahore Accessory House", contact: "Sana Iftikhar", email: "sana@lah.pk", phone: "+92 345 9990011", city: "Lahore", paymentTerms: "Net 45", status: "inactive", createdAt: days(30) },
];

const seedPOs: PurchaseOrder[] = [
  {
    id: "PO-1042",
    supplierId: "s1",
    supplierName: "Faisalabad Textile Mills",
    status: "received",
    lines: [
      { productId: "p1", productName: "Essential Black Tee", qty: 120, unitCost: 890 },
      { productId: "p4", productName: "Ivory Knit Sweater", qty: 40, unitCost: 2450 },
    ],
    total: 120 * 890 + 40 * 2450,
    expectedAt: days(-10),
    createdAt: days(20),
    notes: "AW26 replenishment.",
  },
  {
    id: "PO-1043",
    supplierId: "s3",
    supplierName: "Karachi Knits Ltd.",
    status: "ordered",
    lines: [{ productId: "p3", productName: "Olive Cargo Pant", qty: 80, unitCost: 2100 }],
    total: 80 * 2100,
    expectedAt: days(-5),
    createdAt: days(8),
    notes: "",
  },
  {
    id: "PO-1044",
    supplierId: "s2",
    supplierName: "Sialkot Leather Co.",
    status: "draft",
    lines: [{ productId: "p7", productName: "Onyx Leather Tote", qty: 30, unitCost: 5400 }],
    total: 30 * 5400,
    expectedAt: days(-20),
    createdAt: days(2),
    notes: "Awaiting quote confirmation.",
  },
];

const seedMovements: Movement[] = [
  { id: "m1", productId: "p1", productName: "Essential Black Tee", qty: 120, reason: "purchase", reference: "PO-1042", note: "Received", createdBy: "Bilal (Admin)", createdAt: days(9) },
  { id: "m2", productId: "p1", productName: "Essential Black Tee", qty: -3, reason: "sale", reference: "BG-19KX", note: "Retail order", createdBy: "System", createdAt: days(6) },
  { id: "m3", productId: "p4", productName: "Ivory Knit Sweater", qty: 40, reason: "purchase", reference: "PO-1042", note: "Received", createdBy: "Bilal (Admin)", createdAt: days(9) },
  { id: "m4", productId: "p7", productName: "Onyx Leather Tote", qty: -2, reason: "damage", reference: "-", note: "Water damage in transit", createdBy: "Warehouse", createdAt: days(4) },
  { id: "m5", productId: "p3", productName: "Olive Cargo Pant", qty: -1, reason: "return", reference: "RET-201", note: "Size issue", createdBy: "Support", createdAt: days(2) },
  { id: "m6", productId: "p2", productName: "Sand Utility Jacket", qty: 12, reason: "adjustment", reference: "-", note: "Stocktake correction", createdBy: "Bilal (Admin)", createdAt: days(1) },
];

const seedReturns: ReturnItem[] = [
  { id: "RET-201", orderId: "BG-19KX", productId: "p3", productName: "Olive Cargo Pant", qty: 1, reason: "Size too small", condition: "resellable", status: "refunded", refundAmount: 3990, createdAt: days(2) },
  { id: "RET-202", orderId: "BG-1AB2", productId: "p2", productName: "Sand Utility Jacket", qty: 1, reason: "Colour mismatch", condition: "resellable", status: "approved", refundAmount: 8990, createdAt: days(1) },
  { id: "RET-203", orderId: "BG-1CD9", productId: "p7", productName: "Onyx Leather Tote", qty: 1, reason: "Defective stitching", condition: "defective", status: "requested", refundAmount: 12990, createdAt: days(0) },
];

const seedDiscounts: Discount[] = [
  { id: "d1", name: "AW26 Launch", scope: "all", target: "", type: "percent", value: 10, startAt: days(15), endAt: days(-15), active: true },
  { id: "d2", name: "Men's Outerwear", scope: "category", target: "men", type: "percent", value: 15, startAt: days(5), endAt: days(-25), active: true },
  { id: "d3", name: "Clearance Tote", scope: "product", target: "p7", type: "flat", value: 1500, startAt: days(3), endAt: days(-30), active: false },
];

const seedCoupons: Coupon[] = [
  { id: "c1", code: "WELCOME10", type: "percent", value: 10, minOrder: 3000, usageLimit: 500, used: 128, expiresAt: days(-60), active: true },
  { id: "c2", code: "FREESHIP", type: "flat", value: 250, minOrder: 0, usageLimit: 1000, used: 342, expiresAt: days(-30), active: true },
  { id: "c3", code: "VIP25", type: "percent", value: 25, minOrder: 15000, usageLimit: 50, used: 12, expiresAt: days(-90), active: true },
];

const seedEmployees: Employee[] = [
  { id: "e1", name: "Bilal Ahmed", email: "admin@bilalgarments.pk", phone: "+92 300 0000000", role: "Owner / Admin", status: "active", joinedAt: days(365) },
  { id: "e2", name: "Ayesha Malik", email: "ayesha@bilalgarments.pk", phone: "+92 301 1234567", role: "Store Manager", status: "active", joinedAt: days(220) },
  { id: "e3", name: "Umer Shahid", email: "umer@bilalgarments.pk", phone: "+92 302 2345678", role: "Warehouse Lead", status: "active", joinedAt: days(160) },
  { id: "e4", name: "Zainab Farooq", email: "zainab@bilalgarments.pk", phone: "+92 303 3456789", role: "Customer Support", status: "active", joinedAt: days(90) },
  { id: "e5", name: "Hassan Ali", email: "hassan@bilalgarments.pk", phone: "+92 304 4567890", role: "Cashier", status: "inactive", joinedAt: days(50) },
];

const seedRoles: RoleDef[] = [
  { id: "r1", name: "Admin", description: "Full access across every module.", permissions: ["*"] },
  { id: "r2", name: "Store Manager", description: "Operations, inventory, orders and reports.", permissions: ["orders.*", "inventory.*", "products.read", "reports.read"] },
  { id: "r3", name: "Warehouse", description: "Stock movements and purchase orders.", permissions: ["inventory.*", "purchase.*"] },
  { id: "r4", name: "Support", description: "Handles orders, returns and customers.", permissions: ["orders.read", "returns.*", "customers.read"] },
  { id: "r5", name: "Cashier", description: "Point-of-sale and order creation.", permissions: ["orders.create", "orders.read"] },
];

const seedBanners: Banner[] = [
  { id: "bn1", title: "AW26 · Wear bold.", subtitle: "The new drop is live.", image: "", ctaLabel: "Shop drop", ctaLink: "/shop", active: true, order: 1 },
  { id: "bn2", title: "Free shipping over Rs. 5,000", subtitle: "Nationwide, on us.", image: "", ctaLabel: "Explore", ctaLink: "/category/women", active: true, order: 2 },
];
const seedHero: Hero[] = [
  { id: "h1", eyebrow: "Autumn / Winter 26", headline: "The uniform for the modern maker.", body: "Editorial silhouettes, honest fabrics, made in Lahore.", image: "", active: true },
];
const seedTestimonials: Testimonial[] = [
  { id: "t1", author: "Ayesha K.", role: "Karachi", quote: "The quality is genuinely premium — worth every rupee.", rating: 5, active: true },
  { id: "t2", author: "Hamza R.", role: "Lahore", quote: "Fit, fabric, finish. Bilal Garments nails all three.", rating: 5, active: true },
  { id: "t3", author: "Sara N.", role: "Islamabad", quote: "My go-to for gifting. Elegant packaging, fast delivery.", rating: 4, active: true },
];
const seedActivity: ActivityLog[] = [
  { id: "a1", actor: "Bilal (Admin)", action: "Received PO-1042 into stock", target: "purchase-orders/PO-1042", createdAt: days(9) },
  { id: "a2", actor: "System", action: "Order BG-19KX placed", target: "orders/BG-19KX", createdAt: days(6) },
  { id: "a3", actor: "Warehouse", action: "Logged 2 damaged Onyx Leather Tote", target: "inventory/damaged", createdAt: days(4) },
  { id: "a4", actor: "Support", action: "Refunded RET-201", target: "returns/RET-201", createdAt: days(2) },
  { id: "a5", actor: "Bilal (Admin)", action: "Adjusted stock for Sand Utility Jacket (+12)", target: "inventory/adjustments", createdAt: days(1) },
];
const seedNotifications: Notification[] = [
  { id: "n1", title: "Low stock", body: "Kids Denim Set is out of stock.", level: "warning", read: false, createdAt: days(0) },
  { id: "n2", title: "Return requested", body: "RET-203 · Onyx Leather Tote needs approval.", level: "info", read: false, createdAt: days(0) },
  { id: "n3", title: "PO delivered", body: "PO-1042 received into warehouse.", level: "success", read: true, createdAt: days(9) },
];

// -------------------- Store --------------------

type State = {
  brands: Brand[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  movements: Movement[];
  returns: ReturnItem[];
  discounts: Discount[];
  coupons: Coupon[];
  employees: Employee[];
  roles: RoleDef[];
  banners: Banner[];
  heroes: Hero[];
  testimonials: Testimonial[];
  activity: ActivityLog[];
  notifications: Notification[];

  // brand
  upsertBrand: (b: Brand) => void;
  deleteBrand: (id: string) => void;
  // supplier
  upsertSupplier: (s: Supplier) => void;
  deleteSupplier: (id: string) => void;
  // po
  upsertPO: (p: PurchaseOrder) => void;
  deletePO: (id: string) => void;
  setPOStatus: (id: string, status: PurchaseOrder["status"]) => void;
  // movement
  logMovement: (m: Omit<Movement, "id" | "createdAt">) => void;
  // returns
  upsertReturn: (r: ReturnItem) => void;
  setReturnStatus: (id: string, status: ReturnItem["status"]) => void;
  // discounts / coupons
  upsertDiscount: (d: Discount) => void;
  deleteDiscount: (id: string) => void;
  upsertCoupon: (c: Coupon) => void;
  deleteCoupon: (id: string) => void;
  // employees
  upsertEmployee: (e: Employee) => void;
  deleteEmployee: (id: string) => void;
  upsertRole: (r: RoleDef) => void;
  deleteRole: (id: string) => void;
  // cms
  upsertBanner: (b: Banner) => void;
  deleteBanner: (id: string) => void;
  upsertHero: (h: Hero) => void;
  deleteHero: (id: string) => void;
  upsertTestimonial: (t: Testimonial) => void;
  deleteTestimonial: (id: string) => void;
  // logs
  logActivity: (a: Omit<ActivityLog, "id" | "createdAt">) => void;
  // notifs
  markNotifRead: (id: string) => void;
  markAllRead: () => void;
};

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));

export const useRetail = create<State>()(
  persist(
    (set) => ({
      brands: seedBrands,
      suppliers: seedSuppliers,
      purchaseOrders: seedPOs,
      movements: seedMovements,
      returns: seedReturns,
      discounts: seedDiscounts,
      coupons: seedCoupons,
      employees: seedEmployees,
      roles: seedRoles,
      banners: seedBanners,
      heroes: seedHero,
      testimonials: seedTestimonials,
      activity: seedActivity,
      notifications: seedNotifications,

      upsertBrand: (b) => set((s) => ({ brands: s.brands.find((x) => x.id === b.id) ? s.brands.map((x) => x.id === b.id ? b : x) : [b, ...s.brands] })),
      deleteBrand: (id) => set((s) => ({ brands: s.brands.filter((x) => x.id !== id) })),

      upsertSupplier: (v) => set((s) => ({ suppliers: s.suppliers.find((x) => x.id === v.id) ? s.suppliers.map((x) => x.id === v.id ? v : x) : [v, ...s.suppliers] })),
      deleteSupplier: (id) => set((s) => ({ suppliers: s.suppliers.filter((x) => x.id !== id) })),

      upsertPO: (v) => set((s) => ({ purchaseOrders: s.purchaseOrders.find((x) => x.id === v.id) ? s.purchaseOrders.map((x) => x.id === v.id ? v : x) : [v, ...s.purchaseOrders] })),
      deletePO: (id) => set((s) => ({ purchaseOrders: s.purchaseOrders.filter((x) => x.id !== id) })),
      setPOStatus: (id, status) => set((s) => ({ purchaseOrders: s.purchaseOrders.map((x) => x.id === id ? { ...x, status } : x) })),

      logMovement: (m) => set((s) => ({ movements: [{ ...m, id: uid(), createdAt: Date.now() }, ...s.movements] })),

      upsertReturn: (v) => set((s) => ({ returns: s.returns.find((x) => x.id === v.id) ? s.returns.map((x) => x.id === v.id ? v : x) : [v, ...s.returns] })),
      setReturnStatus: (id, status) => set((s) => ({ returns: s.returns.map((x) => x.id === id ? { ...x, status } : x) })),

      upsertDiscount: (v) => set((s) => ({ discounts: s.discounts.find((x) => x.id === v.id) ? s.discounts.map((x) => x.id === v.id ? v : x) : [v, ...s.discounts] })),
      deleteDiscount: (id) => set((s) => ({ discounts: s.discounts.filter((x) => x.id !== id) })),

      upsertCoupon: (v) => set((s) => ({ coupons: s.coupons.find((x) => x.id === v.id) ? s.coupons.map((x) => x.id === v.id ? v : x) : [v, ...s.coupons] })),
      deleteCoupon: (id) => set((s) => ({ coupons: s.coupons.filter((x) => x.id !== id) })),

      upsertEmployee: (v) => set((s) => ({ employees: s.employees.find((x) => x.id === v.id) ? s.employees.map((x) => x.id === v.id ? v : x) : [v, ...s.employees] })),
      deleteEmployee: (id) => set((s) => ({ employees: s.employees.filter((x) => x.id !== id) })),
      upsertRole: (v) => set((s) => ({ roles: s.roles.find((x) => x.id === v.id) ? s.roles.map((x) => x.id === v.id ? v : x) : [v, ...s.roles] })),
      deleteRole: (id) => set((s) => ({ roles: s.roles.filter((x) => x.id !== id) })),

      upsertBanner: (v) => set((s) => ({ banners: s.banners.find((x) => x.id === v.id) ? s.banners.map((x) => x.id === v.id ? v : x) : [v, ...s.banners] })),
      deleteBanner: (id) => set((s) => ({ banners: s.banners.filter((x) => x.id !== id) })),
      upsertHero: (v) => set((s) => ({ heroes: s.heroes.find((x) => x.id === v.id) ? s.heroes.map((x) => x.id === v.id ? v : x) : [v, ...s.heroes] })),
      deleteHero: (id) => set((s) => ({ heroes: s.heroes.filter((x) => x.id !== id) })),
      upsertTestimonial: (v) => set((s) => ({ testimonials: s.testimonials.find((x) => x.id === v.id) ? s.testimonials.map((x) => x.id === v.id ? v : x) : [v, ...s.testimonials] })),
      deleteTestimonial: (id) => set((s) => ({ testimonials: s.testimonials.filter((x) => x.id !== id) })),

      logActivity: (a) => set((s) => ({ activity: [{ ...a, id: uid(), createdAt: Date.now() }, ...s.activity].slice(0, 200) })),

      markNotifRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n) })),
      markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
    }),
    { name: "bg-retail-v1" },
  ),
);

export const newId = uid;
