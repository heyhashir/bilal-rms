# BALY Retail Management System

BALY Retail Management System (RMS) is a single-store retail platform for **BALY by Bilal Garments EST 2001.** It combines a customer storefront, owner administration, in-store POS billing, inventory, employee commissions, and a Windows POS runtime in one codebase.

The project is designed to run on **one Hostinger Node.js app** with **one Hostinger-managed MySQL/MariaDB database**. It does not require a separate backend host, cloud database, Redis instance, object-storage service, or VPS.

## What It Includes

### Storefront

- Category and subcategory navigation
- Product search, filters, sorting, sale listings, size charts, variants, colors, and stock availability
- Cart, wishlist, Buy Now, guest checkout, account checkout, COD, JazzCash, and EasyPaisa proof uploads
- Order tracking, invoices, account order history, saved addresses, and return requests

### Owner Administration

- Dashboard metrics, revenue, inventory alerts, recent activity, and reporting
- Products, categories, brands, images, videos, variants, barcode/QR values, and archive/restore/delete actions
- Inventory adjustments and movement ledger
- Online orders, payment-proof review, returns, refunds, customers, and shipping zones
- Employees, POS sales, commissions, vendors, purchases, ledger entries, and financial reports
- Store branding, logo text, contact information, promotional ribbon, receipt settings, imports, and staff accounts

### POS And Desktop Billing

- Browser POS at `/pos` for hosted billing
- Barcode/QR, SKU, name, brand, category, size, and color lookup
- Employee attribution per bill line and commission creation
- Receipt numbers, receipt reprints, walk-in refunds, stock movements, and commission reversals
- Windows Electron POS package with local SQLite-backed cache and queue for offline sales/refunds
- Windows printer bridge for 72 mm thermal receipts; USB keyboard-wedge barcode scanners work through the focused scan field

## Architecture

```text
Browser storefront / owner admin / hosted POS
                    |
                    v
        Express API + built React application
                    |
                    v
       Hostinger MySQL / MariaDB (system of record)

Windows POS (Electron + local SQLite)
                    |
          sync when internet is available
                    v
        Same Express API and Hostinger database
```

- `src/` - React storefront, admin, and hosted POS user interfaces
- `backend/` - Express API, Prisma schema, services, repositories, migrations, and seed logic
- `desktop/` - Electron Windows POS shell, local SQLite cache, sync queue, printing bridge, and packaging configuration
- `storage/` - runtime upload/import/release paths; never commit real media or database data
- `docs/developer/` - architecture, operations, QA, patch, and release documentation for maintainers

## Requirements

### Development

- Node.js `20.x`
- npm
- Docker Desktop

### Production

- Hostinger Business or Cloud hosting with Node.js Web Apps enabled
- Hostinger-managed MySQL/MariaDB database
- A domain connected to the Hostinger hosting plan

## Quick Start: Local Development

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Start MariaDB, apply migrations, and seed core data:

   ```powershell
   npm run db:up
   npm run db:prepare
   ```

3. Start the backend and Vite frontend:

   ```powershell
   npm run dev:full
   ```

4. Open the Vite address shown in the terminal. The API runs on `http://127.0.0.1:5000` and Docker MariaDB uses `127.0.0.1:3308` by default.

For a production-style local server that builds React and serves it through Express, use:

```powershell
npm run start:local
```

Open `http://127.0.0.1:5000` after the health check succeeds.

### Local Default Owner Account

The local seed uses the values in `backend/.env.local`:

```text
Email: admin@bilalgarments.pk
Password: admin123
```

These credentials are for local development only. Production startup rejects the default password.

## Client Review With Docker Only

For a clean Windows PC, Docker Desktop is the only required installation. Node.js, npm, Git, and MariaDB do not need to be installed.

After receiving the repository ZIP:

1. Extract it.
2. Open PowerShell in the extracted folder.
3. Run:

   ```powershell
   docker compose up --build
   ```

4. Open [http://localhost:5000](http://localhost:5000).

The Docker stack creates MariaDB, builds the application, applies migrations, seeds review data, and persists database/uploads in Docker volumes. Stop it with `Ctrl+C`; run it in the background with `docker compose up --build -d` and stop it with `docker compose down`.

To remove the review database and uploaded review media completely:

```powershell
docker compose down --volumes
```

## Windows Desktop POS

The desktop package is for the shop billing computer. It starts at the sign-in screen, serves the bundled POS UI locally, stores offline operational data in a local SQLite file, and synchronizes completed sales/refunds when the cloud API is reachable.

### Run During Development

```powershell
npm run desktop:install
npm run desktop:start
```

Set `BILAL_RMS_REMOTE_URL` to the API base URL when using a remote environment. Without it, the desktop runtime uses `http://127.0.0.1:5000`.

### Build A Windows Installer

```powershell
npm run build
npm run desktop:dist
```

The NSIS installer is created under `desktop/dist/`. It is intentionally ignored by Git. Before distributing to staff, test it on a clean Windows PC, configure the real thermal printer, and code-sign the installer.

## Local Database Commands

```powershell
npm run db:up       # start MariaDB
npm run db:down     # stop local containers, preserve data
npm run db:logs     # follow MariaDB logs
npm run db:prepare  # wait for DB, deploy migrations, seed core data
npm run db:reset    # destructive: remove local MariaDB volume
npm run db:validate # validate the Prisma schema against local env
```

The default local connection is:

```env
DATABASE_URL="mysql://bilal_rms:bilal_rms@127.0.0.1:3308/bilal_rms"
```

## Useful Commands

```powershell
npm run build
npm run lint
npm run lint:backend
npm run test:backend:services
npm run test:backend:integration
npm run test:backend:imports
npm run test:qa:smoke
npm run test:qa:regression
npm run test:qa:live
npm run test:qa:customer
npm run test:qa:edge
npm run test:qa:tablet
npm run test:qa:mobile
npm run test:desktop:local
npm run desktop:dist
```

The `test:qa:*` commands are non-destructive: they create uniquely prefixed QA records and selectively remove only those records after each run.

## Production Deployment: Hostinger And GitHub

Use the canonical repository:

```text
https://github.com/heyhashir/bilal-rms.git
```

### Hostinger App Configuration

| Setting | Value |
| --- | --- |
| Runtime | Node.js `20.x` |
| Application root | repository root |
| Production branch | `main` |
| Build command | `npm run build` |
| Start command | `npm run start` |
| Application port | `3000` |
| Health endpoint | `/api/v1/health/ready` |

Create a Hostinger MySQL database first, then set the required environment variables in hPanel:

```env
NODE_ENV=production
PORT=3000
APP_URL=https://your-domain.example
DATABASE_URL=mysql://DB_USER:DB_PASSWORD@DB_HOST:3306/DB_NAME
SESSION_COOKIE_NAME=bilal_rms_session
SESSION_TTL_DAYS=30
UPLOAD_DIR=storage/uploads
IMPORT_DIR=storage/runtime-imports
PUBLIC_DIR=backend/public
MAX_UPLOAD_MB=10
ADMIN_EMAIL=owner@example.com
ADMIN_PASSWORD=use-a-strong-unique-password
DESKTOP_APP_VERSION=0.1.1
DESKTOP_UPDATE_BASE_URL=https://your-domain.example
DESKTOP_UPDATE_NOTES=Production release
```

Copy `.env.hostinger.example` as the reference, never upload real environment files to GitHub.

### What Happens On Each Deploy

1. Push a reviewed commit to `main`.
2. Hostinger pulls the commit, installs dependencies, and runs `npm run build`.
3. `npm run start` runs Prisma migrations and the idempotent core-data bootstrap.
4. Express serves the React build from `backend/public` and APIs from `/api/v1/*`.
5. Existing database rows and uploaded media remain outside Git; a code deployment does not replace them.

Do not use FTP to upload only `public_html` or only `backend/public`. This is a full Node.js application and requires the repository root, backend, built frontend, and runtime storage path.

## Uploads, Imports, And Backups

- Product images, videos, and payment proofs are stored under `storage/uploads` and served at `/uploads/*`.
- Catalog imports are **CSV-only** and capped at 5,000 rows. Convert XLS/XLSX files to CSV before upload.
- GitHub stores code only. It does not back up database rows, uploaded media, or a desktop POS local database.
- Back up the Hostinger MySQL database and `storage/uploads` before significant releases or imports.
- Verify that Hostinger preserves the configured upload directory across a staging redeploy before launch. If it does not, change the storage adapter before production use.

## Verification Before Launch

1. Confirm `/api/v1/health/ready` returns HTTP 200.
2. Sign in as the owner and create a test category, product, and image upload.
3. Place one COD order and one wallet-proof order.
4. Create one POS sale with employee attribution, then verify stock and commission reports.
5. Process one POS refund and verify inventory and commission reversal.
6. Redeploy once and confirm that uploaded files still load.
7. On the billing PC, test barcode scanning, receipt printing, offline billing, reconnect sync, and receipt reprints.

## Security And Scope Notes

- Passwords are hashed; sessions use secure HTTP-only cookies in production.
- Admin routes require authentication and role checks; finance/vendor access is restricted.
- Auth, uploads, and sync endpoints are rate-limited. API payloads are validated with Zod.
- The current launch scope is one store and one billing PC. Multi-register synchronization is structurally supported but needs separate operational acceptance before adding more counters.
- A real thermal-printer test, code-signing the desktop installer, and Hostinger staging validation remain required before final client go-live.

## Developer Documentation

Internal architecture, API, operations, QA, patch, and release material is maintained in [docs/developer/README.md](docs/developer/README.md).
