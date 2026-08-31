# Bilal RMS: Project Context And Handover

> Read this file before changing Bilal RMS. It is a pragmatic handover for a new coding agent or maintainer.
> It describes the intended product, current repository state, deployed environment, operational workflow, and known limitations. It intentionally contains **no passwords, API keys, cookies, database URLs, or other secrets**.

## 1. Project Identity

- **Product:** BALY Retail Management System (RMS), branded as **BALY by Bilal Garments EST 2001.**
- **Repository:** `https://github.com/heyhashir/bilal-rms.git`
- **Primary branch:** `main`
- **Local workspace:** `F:\hashir\bilal-rms`
- **Production website:** `https://balybybilalgarments.com`
- **Target market:** Pakistan, PKR, single retail store, online storefront plus in-store billing.
- **Owner model:** one owner/admin at launch. Staff accounts, employees, and commission attribution are separate concepts.

### Product Goal

This is not a static fashion website. It is one retail system with:

- public storefront, catalog, search, cart, wishlist, checkout, and order tracking;
- owner administration for catalog, inventory, finance, customers, staff, vendors, and settings;
- hosted browser POS at `/pos`;
- a Windows Electron POS application for a shop billing PC;
- a hosted MySQL/MariaDB database as the business/reporting authority;
- local SQLite in the desktop app only for offline POS continuity and sync queuing.

## 2. Current State Snapshot

This snapshot was refreshed on **2026-08-31**. Re-check it with `git status`, `git log`, and the production health endpoints before acting.

| Item | Current state |
| --- | --- |
| Git branch | `main` |
| Audit baseline | Release code `dd870ee`; CI workflow update `3bbc213` |
| Pull Requests / CI | GitHub Build Verification passed strict install, high-severity audit, lint, Prisma validation, and build without annotations. |
| Working tree | Release code and CI changes are pushed; documentation may contain a later evidence-only commit. |
| Frontend/backend build | Passed locally and in GitHub CI. |
| Desktop package version | `0.3.2`, published |
| Desktop installer | `desktop/dist/BilalRMS-Setup-0.3.2.exe`, 105,224,098 bytes, SHA-256 `8EB19CD7C850CFB56D83AAEAF9F831B654A58E089FA2D17B3B745CBEF57DFE0D`; Authenticode `NotSigned`. |
| Desktop release publication | Published and server-verified; `0.3.1` clients receive `available: true` for `0.3.2`. |
| Production web deployment | Hostinger readiness/catalog checks and scoped live product CRUD passed on 2026-08-31. |
| Local web server | Local production build and Docker MariaDB at `127.0.0.1:3308` passed the audit; processes may be stopped after QA. |

### Latest Local Audit Changes

- Employee login provisioning now uses an optional unique Employee-to-AdminAccount relation and one database transaction. Only administrators can create/change login credentials; archiving an employee deactivates the linked account and revokes sessions.
- Online revenue/profit recognizes only `DELIVERED` orders. Operational order counts remain separate. POS cashier identity is separate from line-level salesperson attribution, and refund display references are unique.
- Write-enabled QA is localhost-only and always cleans scoped records; remote smoke is read-only. Browser, backend, performance, Electron persistence, update-feed and packaged-launch gates pass locally.
- Product zero values are preserved, database errors are not swallowed, currency fallback handles network/HTTP/payload failures, and unsupported standalone Size Guides navigation is removed while per-product guides remain.
- Prisma is upgraded to 7.10.0, clean installs/builds pass, and root/desktop dependency audits report zero vulnerabilities.
- Production startup reconciles known additive columns/indexes if shared-hosting migration history and restored schema drift apart. Readiness verifies critical catalog, inventory, employee, and POS columns.
- Storefront/admin query failures show explicit retry states rather than false empty data. Desktop bootstrap failures retain update checking and recoverable retry/offline behavior.
- Release `0.3.2` uses the patched deduplicated `mariadb@3.5.3` connector and requires environment-supplied Playwright admin credentials.
- Contact-page email/phone reconciliation is intentionally deferred at the owner's request; do not silently overwrite it from store settings.
- Release code is deployed and desktop `0.3.2` is published. Live QA left one archived `qa-release-1788189007119` product because its stock history correctly blocks permanent deletion; it is not customer-visible.

### Historical And Current Feature Notes

1. **Product Creation Schema & Error Feedback Polish**:
   - Resolved "Validation failed" errors when adding products through the admin modal (`/admin/products`).
   - Relaxed `description` constraint in `backend/src/schemas/admin/catalog.schemas.ts` from `min(3)` to optional with default empty string (`z.string().default('').optional().nullable().or(z.literal(''))`).
   - Relaxed `colorHex` in `variantSchema` and `colorSchema` to safely default to `#000000`.
   - Updated `makeDraft` in `src/routes/admin.products.tsx` to dynamically default `categorySlug` to the store's first available category from the database rather than hardcoded `"men"`.
   - Improved error middleware in `backend/src/middleware/errorHandler.ts` to format Zod validation issues with explicit field names and messages rather than generic `"Validation failed"`.
   - Enhanced client-side validation in `src/routes/admin.products.tsx` and `src/lib/api.ts` to map issue paths into actionable toast notifications.

2. **Session Expiration Guard & Error Handling**:
   - Fixed `shouldEmitAuthExpired` in `src/lib/api.ts` to strictly require `status === 401`.
   - Prevented non-auth HTTP response codes (e.g. 404 Not Found or 400 Bad Request) from mistakenly dispatching `AUTH_EXPIRED_EVENT` and logging active users out with "Your session expired".

3. **Honeywell Orbit MS7120 Hardware Scanner Integration**:
   - Keyboard-wedge scanner behavior is implemented and simulated. Physical Honeywell Orbit acceptance remains required.
   - Global keystroke buffer listener detects high-speed laser scan bursts (<60ms inter-key delays) even when the input box is not clicked, enabling hands-free presentation counter scanning.
   - Exact Match Priority engine matches scanned 1D Code 128 / Code 39 tags against barcode, SKU, QR code, and `#` tag prefixes (e.g. `# 57678`, `50330`, `45881`).
   - Integrated cash register audio feedback using Web Audio API (1400Hz positive scan chime, 300Hz error tone).
   - Multi-scan quantity auto-incrementation (repeated scan of same barcode increments cart line quantity).
   - Automatic input clearing and refocus for high-throughput retail checkout.

4. **Desktop Release 0.3.0**:
   - Version bump across `desktop/package.json` to `0.3.0`.
   - Packaged unsigned Windows installer `BilalRMS-Setup-0.3.0.exe` (approximately 100.3 MB).
   - Local N/N+1 update discovery is verified. Production publication state must be checked separately.

5. **Uncongested Dedicated Standalone Admin Menus**:
   - Restructured admin navigation and separated composite pages into dedicated standalone routes:
     - **Overview**: Dashboard (`/admin`), P&L Reports (`/admin/reports`), Bill-Wise Sales (`/admin/bill-wise`).
     - **Catalog**: Products (`/admin/products`), Categories (`/admin/categories`), Brands (`/admin/brands`). Size guides are edited per product; the standalone deferred menu is not exposed.
     - **Inventory & Purchasing**: Stock Manager (`/admin/inventory`), Inventory Valuation (`/admin/inventory-valuation`), Vendors (`/admin/suppliers`), Vendor Purchases (`/admin/vendor-purchases`).
     - **Sales & Billing**: POS Terminal (`/pos`), POS Invoices (`/admin/pos-sales`), Online Orders (`/admin/orders`), Returns Log (`/admin/returns`), Refunds Log (`/admin/refunds`).
     - **Finance**: Expense Ledger (`/admin/ledger`), Staff Commissions (`/admin/commissions`).
     - **People & Store**: Employees (`/admin/employees`), Customers (`/admin/customers`), Staff Access (`/admin/roles`), Settings (`/admin/settings`), CSV Imports (`/admin/imports`).
   - Eliminated tab clutter across inventory and reports so accountants, owners, and cashiers have direct 1-click tools.
   - Maintained strict role-based access control and zero-emoji compliance across the entire codebase.

6. **Bill-Wise Sales & Collections Audit Report (Cash and Credit Details)**:
   - Modeled after the QuickBooks POS `Cash and Credit Details` reference standard.
   - Endpoint `/api/v1/admin/reports/bill-wise` and CSV export `/api/v1/admin/reports/bill-wise/export` in `backend/src/services/report.service.ts`.
   - Displays all bills/receipts with columns: Expand `[+]`, `Date`, `Time`, `Receipt #`, `Receipt Type` (`Sales` vs `Refund`), `Qty Sold`, `Total`, `Payment Method`, and `Cashier` (Admin or employee name).
   - Expandable rows allow drilldown into line items, sizes, colors, and line totals for each bill.
   - 4-way filter toolbar: Date range presets (`Today`, `Yesterday`, `This Week`, `This Month`, `All Time`), Cashier selector (All Cashiers, Admin, specific employee), Payment method (Cash, Card, JazzCash, Easypaisa, Bank Transfer), Receipt type (Sales vs Refunds), and search.
   - Bottom auto-summation bar (`Grand Total`) dynamically totals up all bills, net pieces sold, cash collected, card/digital collected, and grand net collections.
   - Includes CSV export and printable A4 daily audit sheet.
   - Strict zero-emoji compliance across code, comments, and UI.

7. **Department-Wise Inventory Valuation & Stock Evaluation Report**:
   - Modeled directly after the QuickBooks POS / Enterprise RMS Inventory Valuation standard.
   - Comprehensive backend valuation engine in `backend/src/services/inventory.service.ts` and endpoints `/admin/inventory/valuation` and `/admin/inventory/valuation/export`.
   - Aggregates simple products and variant matrix entries grouped by department/category with weighted average unit cost, total department units, and extended cost totals.
   - Grand Total summary bar calculates store-wide total cost valuation, total retail potential, on-hand pieces, and gross profit margin.
   - UI features multi-level filtering by Department/Category, Brand, In-Stock Only vs All Catalog, and real-time search.
   - Row-level quick actions for Barcode Label sticker printing and immediate stock adjustment.
   - Direct CSV export and A4 printable physical audit sheet with dedicated `@media print` clean document styling.

8. **Employee Role Isolation & Direct Login Provisioning (Email + Password)**:
   - When creating or editing employees in `/admin/employees`, administrators can assign an optional **Login Email** and **Password** (minimum 8 characters).
   - Backend transactionally provisions/synchronizes a linked `AdminAccount` with `STAFF` role and hashed credentials; managers cannot provision login credentials.
   - Access control rules configured so that `STAFF` users are strictly restricted to POS billing (`/pos`), inventory lookup/adjustment (`/admin/inventory`), product catalog (`/admin/products`, `/admin/categories`, `/admin/brands`), and label sticker printing.
9. **Live PKR ⇄ USD Currency Conversion**:
   - Integrated live daily exchange rate auto-fetch from open financial rate endpoints (`https://open.er-api.com/v6/latest/USD` with fallback to `https://api.exchangerate-api.com/v4/latest/USD`).
   - Caching layer (`src/lib/currency.ts`) stores rate in memory and `localStorage` with a 6-hour TTL and safe offline fallback default (1 USD ≈ 278.0 PKR).
   - Dual currency pricing rendered across Product Cards (`src/components/shop/ProductCard.tsx`), Product Detail Page (`src/routes/product.$slug.tsx`), Cart line items and total (`src/routes/cart.tsx`), and Checkout Order Summary (`src/routes/checkout.tsx`).
   - Base prices, cart totals, and payment transactions remain strictly settled in **PKR (`Rs.`)**.

10. **100% Customizable Size Guides (Optional per Product)**:
   - Added `customSizeChartJson Json?` to `Product` model in `backend/prisma/schema.prisma` with production migration `20260821210000_custom_size_chart_json`.
   - Admin Product Modal (`src/routes/admin.products.tsx`) features an optional **"Customize Size Chart"** editor supporting editable guide titles, dynamic column renaming/adding/deletion, and dynamic size row matrix editing.
   - 1-click category preset loaders (**Apparel**, **Bottoms**, **Kids**) and **Reset Default** button.
   - Storefront product modal (`src/routes/product.$slug.tsx`) dynamically renders custom table columns, rows, and measurement values per product.

11. **Refined Apparel Color Palette & Pigment Adjuster**:
   - Replaced basic raw color inputs with 22 apparel standard quick swatches (`PRESET_COLORS`).
   - Added expandable **"Adjust Pigments"** tool with spectrum color picker and hex code input.
   - Added **"+ Custom Color"** option for non-standard color additions.

12. **Thermal Barcode Label Calibrations**:
   - Presets support 38x25, 40x28, 50x25, 50x30 and 58x40 mm labels plus validated custom dimensions and rotation.
   - Shortened product titles automatically on barcode stickers to prevent line overflow.
   - Barcodes strictly print the original retail price rather than sale/discounted price.

13. **International Orders & Checkout Clarity**:
   - Standardized international destination selections settling in PKR with explicit transaction guarantee badges.

14. **Item-Wise Sales & Ledger Reporting**:
   - Added item-wise sales breakdown, units sold, units refunded, net revenue, cost, and net profit calculations to `backend/src/services/report.service.ts` and Admin Reports UI.

15. **CI & Security Audit Pipeline**:
   - Addressed dependency advisories via package overrides in `package.json`.
   - Updated GitHub Actions CI in `.github/workflows/deploy.yml` with `--audit-level=critical` and resilient `npm ci || npm install` cross-platform dependency handling.

## 3. Architecture

```text
Public browser / Admin browser / Hosted POS
                |
                v
React + Vite single-page application (src/)
                |
                v
Express API and static file server (backend/)
                |
                v
Hostinger-managed MySQL/MariaDB (business system of record)

Windows Electron POS (desktop/)
  - bundled React build
  - private local loopback server/proxy
  - local SQLite operational cache and durable sync queue
  - Windows printing bridge
                |
        online sync / update manifest
                v
Same Express API + Hostinger MySQL
```

### Important System-of-Record Rules

- **Hostinger MySQL/MariaDB** is the authoritative source for catalog, inventory, online orders, POS sales after synchronization, receipts, commissions, reports, customers, staff, and settings.
- The desktop application's local SQLite database is an **offline operational copy**, not cloud reporting truth.
- Browser-hosted POS can work online. The Electron POS is the intended offline billing runtime.
- Online orders and POS sales are separate lifecycles. Do not merge them into one table or use shipping statuses for counter bills.
- Every stock-changing workflow must create an `InventoryMovement`; do not directly update stock outside the inventory/POS/order service paths.
- POS sales create commissions only when lines are attributed to an `Employee`. A staff login does not automatically imply a commission employee.

## 4. Repository Map

| Path | Responsibility |
| --- | --- |
| `src/` | React storefront, account, admin, hosted POS, routes, visual components, TanStack Query data access, Zustand client-only state. |
| `backend/src/` | Express app, controllers, services, repositories, validation, auth, Prisma-backed domain logic, upload and sync APIs. |
| `backend/prisma/` | Prisma MySQL schema and additive migrations. |
| `backend/public/` | Generated Vite production output. Never hand-edit. |
| `desktop/` | Electron main/preload/renderer integration, local SQLite store, printing, sync, package config, installer builder. |
| `scripts/` | Local environment preparation, Hostinger startup/migration helpers, desktop release publishing, QA runners. |
| `storage/` | Runtime-only uploads/imports/desktop release files. Do not commit real customer media/data. |
| `docker/`, `compose.yaml`, `Dockerfile` | Reproducible local/client-review MariaDB + application runtime. |
| `docs/developer/` | Internal architecture, deployment, operations, QA, release checklist, feedback source material. |
| `context.md` | This handover document. Keep it updated after material changes. |

## 5. Technology And Runtime

- Node.js: `^20.19.0 || >=22.12.0`; Hostinger uses Node `20.x`.
- Package manager: npm `10.8.2`.
- Frontend: React 19, Vite 7, TypeScript, TanStack Router, TanStack Query, Zustand, Tailwind CSS/Radix UI.
- Backend: Express, TypeScript, Prisma 7.10, Zod, MySQL2, Multer.
- Database: MySQL/MariaDB. Development uses MariaDB 11.4 through Docker.
- Desktop: Electron 43, `sql.js` SQLite-compatible local database, `bwip-js` barcode generation, electron-builder NSIS installer.
- Browser tests: Playwright.

## 6. Major Functional Scope

### Storefront and Customer

- API-driven parent/child categories and navigation flyouts.
- Product catalog, parent category and subcategory browsing, search, filters, pagination, sorting, sale listings, sale popup, brand/category filters.
- Product variants with colors, letter or numeric sizes, per-variant stock, size charts, product images and videos.
- Cart, wishlist, Buy Now temporary checkout flow, guest and account checkout.
- COD plus JazzCash/EasyPaisa payment proof upload.
- Account registration/login/logout, duplicate-email prevention, profile, addresses, order history, invoice/track order, return requests.

### Admin / Retail Operations

- Dashboard, revenue/order/inventory/activity metrics, reports and exports.
- Products, categories/subcategories, brands, product media, barcode/QR values, sale price, archive/restore/permanent delete.
- Inventory stock adjustments, low-stock alerts, movement history, simple or variant stock modes.
- Online orders, payment-proof review, returns/refunds, customers, shipping zones.
- POS sales, receipts/reprints, walk-in returns/refunds, commission reporting/payout states.
- Employees for sales attribution and commissions; separately managed admin/staff accounts.
- Vendors, vendor purchases, stock intake, ledger entries, profit reports.
- Settings for branding/logo text, contact/location, top promotional ribbon, label prefixes/templates, receipt header/footer, and size-chart choices.
- CSV catalog import. XLS/XLSX must be converted to CSV first.

### Roles

- `ADMIN`: full administration, including finance, vendor, ledger, staff-account, and settings access.
- `MANAGER`: operational catalog, orders, inventory, customers, POS, barcode flow, and vendor-purchase activity; finance-restricted areas are blocked.
- `STAFF`: POS and catalog scope only.
- Storefront `User`, back-office `AdminAccount`, and commission-only `Employee` are intentionally distinct models.

### POS

- Product lookup by barcode/QR, SKU, name, brand, category/subcategory, size, or color.
- Independent employee attribution for each POS line.
- Cash/card/JazzCash/EasyPaisa/bank-transfer options as defined by the schema.
- Stable receipt numbers, reprints, inventory movement creation, commission creation/reversal, returns/refunds.
- Web POS route: `/pos`.
- Desktop POS: local persistent cache/queue, offline finalized sale/refund behavior, reconnect sync and update check.

## 7. Database Summary

Prisma schema: `backend/prisma/schema.prisma`.

Key models include:

- Identity: `User`, `Session`, `Address`, `AdminAccount`, `AdminSession`.
- Catalog: `Category` (self relation with parent/children), `Brand`, `Product`, `ProductImage`, `ProductVariant`, `CommissionRule`.
- Commerce: `Order`, `OrderItem`, `PaymentProof`, `ReturnRequest`, `RefundRecord`, `ShippingZone`.
- Inventory/POS: `InventoryMovement`, `PosSale`, `PosSaleItem`, `PosPayment`, `PosReturn`, `Receipt`, `DocumentSequence`.
- Staff/finance: `Employee`, `CommissionEntry`, `Vendor`, `VendorPurchase`, `LedgerEntry`.
- Offline sync/settings: `RegisterDevice`, `SyncJob`, `StoreSetting`.

### Migration Policy

- Prisma migrations are **additive only**. Never drop/rename/change a live column type as a quick fix.
- Existing migrations are under `backend/prisma/migrations/`, through `20260831150000_product_variant_image` at this snapshot.
- Prisma 7 connection configuration is in `backend/prisma.config.ts`; generated client output is under `backend/src/generated/prisma` and is ignored source output.
- Run `npm run db:deploy` against a correctly configured target. Do not run destructive reset commands against production.
- Seed/bootstrap is intended to be idempotent: it creates missing owner/store/register defaults but must not erase business data.

## 8. Local Development

### Prerequisites

- Node.js 20.x.
- npm.
- Docker Desktop.
- A local `backend/.env.local`, created from `backend/.env.local.example`.

### Default Local Database

`compose.yaml` starts MariaDB at `127.0.0.1:3308` by default. The local database is `bilal_rms` with local-only Docker credentials documented in `backend/.env.local.example`.

Do **not** use those local defaults in production.

### Normal Local Workflow

```powershell
# First-time dependency installation
npm install

# Start persistent MariaDB
npm run db:up

# Wait, migrate, and seed defaults
npm run db:prepare

# Starts backend and Vite dev server; Ctrl+C stops both app processes
npm run dev:full
```

For a production-style local server that serves the Vite build through Express:

```powershell
npm run build
npm run start:local
# then open http://127.0.0.1:5000
```

Useful database commands:

```powershell
npm run db:logs
npm run db:down       # preserves data
npm run db:reset      # DESTRUCTIVE: deletes local Docker volumes
npm run db:validate
```

If Docker reports port `3308` is in use, find/stop the conflicting local service or set `LOCAL_DB_PORT` before starting Compose. Do not change production connection settings to solve a local port conflict.

### Stop Local Site Instances

The local production server uses port `5000`; Vite commonly uses `5173`. Stop only processes belonging to this app. Docker MariaDB is intentionally separate and can remain running.

## 9. Quality Gates

Run before committing meaningful changes:

```powershell
npm run lint
npm run lint:backend
npm run build
npm run db:validate
npm run test:backend:services
npm run test:backend:integration
npm run test:backend:imports
npm run test:e2e:smoke
npm audit --audit-level=high
```

Additional QA commands:

```powershell
npm run test:qa:smoke
npm run test:qa:regression
npm run test:qa:live
npm run test:qa:customer
npm run test:qa:edge
npm run test:qa:tablet
npm run test:qa:mobile
npm run test:e2e:live       # strictly read-only target smoke
npm run test:performance
npm run test:desktop:local
npm run test:desktop:live
npm run test:desktop:update
npm run desktop:pack
npm run desktop:dist
```

The detailed QA evidence and release gate are in `docs/developer/qa-report.md` and `docs/developer/RELEASE_CHECKLIST.md`. Do not claim physical hardware or Hostinger persistence tests pass unless they have actually been repeated on the target hardware/environment.

## 10. Hostinger Production Deployment

### Production Model

- One Hostinger Node.js web application.
- One Hostinger-managed MySQL database.
- One domain serves storefront, admin, POS, APIs, uploads, and desktop release files.
- GitHub `main` is the deployment branch; Hostinger pulls it automatically.

### Hostinger Configuration

| Setting | Value |
| --- | --- |
| Repository | `heyhashir/bilal-rms` |
| Branch | `main` |
| Root directory | repository root (`./`) |
| Framework | Express |
| Node runtime | `20.x` |
| Build | `npm run build` |
| Start | `npm run start` |
| Port | Hostinger-provided `PORT` or default `3000` |
| Health | `/api/v1/health/live` and `/api/v1/health/ready` |

### Production Startup Details

`scripts/start-production.mjs` is intentionally Hostinger-specific. It:

1. applies non-secret production defaults such as app URL, upload paths, and desktop release directory;
2. builds `DATABASE_URL` from Hostinger's local MySQL host/user/database and the supplied **`DB_PASSWORD`**;
3. imports compiled `backend/dist/server.js` directly so Hostinger monitors the actual Express process;
4. starts migrations asynchronously after Express binds, so startup can satisfy Hostinger while readiness reflects DB initialization.

Required secret environment values in Hostinger hPanel:

```env
DB_PASSWORD=<current Hostinger MySQL user password>
ADMIN_PASSWORD=<strong owner-admin password>
ADMIN_EMAIL=<owner admin email>
```

Reference only: `.env.hostinger.example`. Never import a real `.env` into Git or commit it.

### Past Hostinger Issues And Their Resolution

- **`spawn npm ENOENT`:** Hostinger expects an entry process, not a child-spawned `npm` startup strategy. Fixed by importing compiled server in `start-production.mjs`.
- **Prisma engine `EACCES`:** Linux Prisma CLI engine required preparation for Hostinger. The build/release scripts include engine handling.
- **Missing `backend/dist/server.js`:** caused by not building the backend before runtime. Build now performs client + server builds.
- **Vite/plugin missing during postinstall:** package/lockfile and build chain were corrected; production must still use the committed lockfile.
- **Prisma P1000 MySQL authentication:** use the current Hostinger DB password in `DB_PASSWORD`, URL-encode by script; do not manually construct a broken `DATABASE_URL`.
- **Live endpoints returning 500 after deploy:** generally indicates migrations/seeding did not complete or the app was using an invalid database credential. Check runtime logs and readiness before changing frontend code.

### Upload Persistence Warning

Product media/payment proofs live under `storage/uploads`; desktop releases under `storage/desktop`. Hostinger must preserve these runtime paths across redeploys. This should be verified after any Hostinger platform configuration change. GitHub deployments only update code, not business records or media.

## 11. Desktop POS And Release Process

### Runtime Behavior

- Windows only at launch.
- One billing PC is the initial operational target, but device IDs, receipt numbering, queues, and sync checkpointing are designed for more later.
- USB keyboard-wedge barcode scanners work through the focused scan field and Enter terminator.
- Thermal receipt target is a Windows-installed 80 mm printer. Browser labels and Electron thermal receipts are different workflows.
- Packaged application default remote URL: `https://balybybilalgarments.com`.
- For local/staging Electron testing only, set `BILAL_RMS_REMOTE_URL`.

### Build And Release Desktop Updates

Desktop releases must always accompany a desktop-relevant web/API change. The user explicitly requested this as an ongoing rule.

```powershell
# Build current web assets and installer
npm run build
npm run desktop:dist

# Publish to production after the matching source revision is live.
# backend/.env.local must have the CURRENT production admin login.
npm run desktop:publish-remote -- `
  --base-url https://balybybilalgarments.com `
  --env-file backend/.env.local `
  --notes "Short release notes"
```

The secure publishing script logs in through `/api/v1/auth/login`, splits the installer into 4 MB chunks, uploads it to the admin desktop-release API, and verifies the server-side SHA-256, size, and public manifest.

### Desktop Update Verification

```powershell
npm run test:desktop:live
```

Or verify manually:

```text
GET https://balybybilalgarments.com/api/v1/sync/updates/<deviceKey>?currentVersion=<installedVersion>
```

Expected for an older client: `latestVersion` is newer, `available` is `true`, and `windows.installerUrl` references the expected installer.

Local source version is `0.3.2`. The August 31 audit verified a local N/N+1 feed; query the production manifest after publication before claiming which version is live.

### Desktop Limitations

- The Windows installer is not code-signed. Windows SmartScreen can warn users. Code-sign before client-wide rollout if possible.
- Physical printer behavior needs validation on the actual printer/driver; software checks cannot verify paper feed, cutter, print density, or scanner reliability.
- Auto-update downloads an installer and launches it; it does not silently replace the app without Windows installer interaction.
- Desktop local SQLite data must be preserved across updates. Do not alter its storage path without a migration/backup strategy.

## 12. Variant And Barcode Sticker UX Notes

### Product Variant Matrix

For `stockMode = variant`:

1. Admin adds sizes and colors.
2. Admin selects **Letter: S/M/L** or **Numeric: 28-36**; this fills the editable comma-separated input.
3. Admin clicks **Generate matrix**.
4. Each size/color cell holds independent stock and maps to one `ProductVariant`.
5. On the product page, a customer can select an available matrix cell; standard color and size controls remain synchronized.

Accessories should use `sizeChart = none`; they should not fall back to apparel size charts.

### Sticker Printing

The default application label is **38 x 25 mm** in landscape. Presets and custom dimensions are available, but the selected driver paper must exactly match the application dimensions. The preferred branded sticker matches the feedback reference: BALY brand panel, product title, code, size, color, price, barcode, and barcode value.

For browser printing:

- Select a printer-driver paper form sized **38.1 x 25.4 mm**.
- One page per sheet, `100%` scale, no margins, background graphics on.
- Turn **Headers and footers OFF** in the browser print dialog.
- Do not use `Credit Card` paper size; it is 85.6 x 54 mm and creates whitespace/scaling issues.

Browser pages cannot programmatically suppress Chrome's date, title, `about:blank`, and page-count headers/footers. If the client requires label printing without user-configured print settings, implement a server-generated PDF label endpoint or a native Electron label print path; do not try to solve it with more CSS.

## 13. Source Feedback And Existing Documentation

- Client feedback source: `docs/developer/feedback/new feedback.md`.
- Reference images: `size chart.jpeg`, `tag with sizing.jpeg`, `tag.jpeg`, `expected recipt.jpeg`, `curent recipt.jpeg`.
- QA/release/planning docs: `docs/developer/`.
- These files are internal maintainer documentation. Do not expose them as storefront content.

## 14. Known Risks And Work Still Requiring Acceptance

The project has substantial feature coverage, but it should not be described as literally perfect or fully hardware-certified. The following require care:

1. **Physical printer acceptance:** test the real 80 mm receipt printer and the actual barcode-label printer/paper form.
2. **Hostinger runtime storage:** re-check that uploads and desktop release files survive a redeploy/restart on the current plan.
3. **Production backup process:** regularly export MySQL and back up `storage/uploads` and `storage/desktop`; GitHub is not a data backup.
4. **Code signing:** create/sign desktop installer before broad public/client distribution to prevent SmartScreen trust warnings.
5. **Production admin credentials:** the desktop release publishing script requires a current production admin login in a local, ignored env file. If it reports `Invalid credentials`, update local credentials, never weaken authentication.
6. **Multiple counters:** structurally prepared, but adding multiple active POS devices needs reconciliation/load/hardware acceptance testing before relying on it operationally.
7. **Desktop release version:** the version in `desktop/package.json` must align with the deployed source version; increment version before building/publishing a new installer.
8. **Production QA residue:** one archived `qa-release-1788189007119` product remains because its stock history correctly blocks permanent deletion. It is not customer-visible; remove it only through an approved history-aware maintenance process.
9. **Deferred modules:** inspect navigation and direct routes before surfacing any module not actually supported; the standalone Size Guides menu is intentionally removed while per-product guides remain.

## 15. Safe Working Rules For Future Agents

1. Read this file, `README.md`, and relevant `docs/developer/` material before making architecture claims.
2. Start with `git status`; preserve user modifications and unrelated dirty files.
3. Use `apply_patch` for source edits.
4. Do not commit `.env*` files containing real secrets, `storage/` business media/data, generated installers, or local databases.
5. Do not use `git reset --hard`, `git checkout --`, destructive production SQL, or Prisma resets unless the user explicitly approves.
6. Run targeted build/tests after a change. For frontend changes, at least run `npm run lint` and `npm run build`.
7. For a production release: commit/push web code to `main`, verify Hostinger deployment and readiness, then build/publish a matching desktop installer if the desktop runtime/assets/API behavior changed.
8. Do not claim deployment, database migration, desktop release, or live behavior without checking the actual endpoint/log/output.
9. Never ask the user to paste passwords into chat. Use their local ignored env file and report only success/failure.
10. Keep `context.md` updated when architecture, production configuration, latest desktop version, deployment process, or important risks change.

## 16. Fast First Steps In A New Agent Session

```powershell
cd F:\hashir\bilal-rms
git status --short
git log -5 --oneline
npm run lint
npm run build
```

Then decide based on the request:

- **Local web bug:** `npm run db:up`, `npm run db:prepare`, `npm run start:local`.
- **Frontend-only bug:** start `npm run dev:full` or local production server and inspect in browser.
- **Backend/DB bug:** use Docker MariaDB; run targeted integration/service test. Never point experimental migrations at Hostinger.
- **Desktop bug:** `npm run desktop:start`, use `BILAL_RMS_REMOTE_URL` only for test targets, and preserve local SQLite state.
- **Production release:** ensure clean intended diff, test, commit/push `main`, wait for Hostinger, verify health, then publish the matching desktop installer if needed.

## 17. Useful Endpoints

| Endpoint | Purpose |
| --- | --- |
| `/` | Storefront |
| `/shop` | Catalog |
| `/sale` | Sale catalog |
| `/login` | Customer/admin sign-in entry |
| `/admin` | Admin shell |
| `/pos` | Browser POS |
| `/api/v1/health` | Basic backend health |
| `/api/v1/health/live` | Liveness probe |
| `/api/v1/health/ready` | Readiness/database/bootstrap probe |
| `/api/v1/categories` | Public category tree |
| `/api/v1/catalog/products/sale` | Public sale products |
| `/api/v1/sync/updates/:deviceKey` | Desktop update manifest |
| `/desktop/windows/BilalRMS-Setup-<version>.exe` | Published Windows installer |

---

Last handover update: **2026-08-31** (`QA-20260831-RELEASE-VALIDATION`; verify the Git revision and production manifest before claiming deployment).
