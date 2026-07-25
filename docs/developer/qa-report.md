# Bilal RMS QA Report

**Run ID:** `QA-20260725-001`
**Date:** 25 July 2026
**Scope:** Non-destructive local release validation for storefront, admin, web POS, desktop POS runtime, security controls, and packaging.

## Environment And Baseline

| Item | Value |
| --- | --- |
| Workspace | `F:\hashir\bilal-rms` |
| Baseline commit | `ebd2d22` (QA changes are currently uncommitted) |
| Local runtime | Node `24.11.0`, npm `11.6.1` |
| Production target | Node `20.x` on Hostinger |
| Database | Existing Docker MariaDB, `127.0.0.1:3308` |
| Web/API target | `http://127.0.0.1:5000` |
| Desktop package | Bilal RMS POS `0.1.1`, Electron `33.4.11` |
| Windows installer | `desktop/dist/BilalRMS-Setup-0.1.1.exe`, 85,594,819 bytes |

No MariaDB volume, existing business record, or desktop SQLite runtime data was reset or deleted. All browser QA data used a unique `qa-<suite>-<timestamp>` prefix and was selectively cleaned after each run.

## Release Test Matrix

| Area | Coverage | Result | Evidence |
| --- | --- | --- | --- |
| Build | Vite production client and TypeScript backend build | PASS | `npm run build` |
| Schema | Prisma schema validation using `backend/.env.local` | PASS | `npm run db:validate` |
| Health | Liveness and readiness endpoints | PASS | `/api/v1/health` and `/api/v1/health/ready` returned 200 |
| Backend services | Inventory, POS, commission, checkout domain workflows | PASS | `npm run test:backend:services` |
| Backend integration | Auth, CSRF, duplicate email, checkout, upload rejection, stock, POS/refund, reports, RBAC, sync idempotency, exports | PASS | `npm run test:backend:integration` |
| CSV import | Valid import and XLSX rejection | PASS | `npm run test:backend:imports` |
| Web smoke | Storefront, admin, POS sale/refund, commission and reporting | PASS | `npm run test:qa:smoke` |
| Web regression | Retail entity creation, POS refund, commission reversal | PASS | `npm run test:qa:regression` |
| Live-safe QA | Shop, POS history, commission visibility and normal navigation | PASS | `npm run test:qa:live` |
| Customer QA | Search/no-results, category sorting, size guide, Buy Now, wishlist/cart, sale endpoint | PASS | `npm run test:qa:customer` |
| Edge | Customer QA in Microsoft Edge | PASS | `npm run test:qa:edge` |
| Tablet | Customer QA in iPad/WebKit emulation | PASS | `npm run test:qa:tablet` |
| Mobile | Customer QA in Pixel/Chromium emulation | PASS | `npm run test:qa:mobile` |
| Route scope | Controller architecture and deferred admin route checks | PASS | `npm run check:architecture`, `npm run check:deferred-routes` |
| Frontend lint | TypeScript/React lint | PASS WITH WARNINGS | 0 errors; 16 non-blocking Fast Refresh/Hook dependency warnings |
| Backend lint | Backend TypeScript lint | PASS | `npm run lint:backend` |
| Desktop local data | Offline sale/refund persistence, local stock restoration, durable receipt, receipt HTML width | PASS | `npm run test:desktop:local` |
| Desktop package | Windows x64 NSIS installer generation | PASS | `npm run desktop:dist` |
| Dependency audit | Production dependency audit | PASS WITH LOWS | 0 moderate, high, or critical; 3 low development/transitive advisories |

## Performance Results

Twenty local samples were taken after the final backend restart. The normal local API p95 budget is under 750 ms.

| Endpoint | Average | p95 | Budget | Result |
| --- | ---: | ---: | ---: | --- |
| `/api/v1/health` | 2.34 ms | 2.73 ms | < 750 ms | PASS |
| `/api/v1/health/ready` | 2.12 ms | 4.06 ms | < 750 ms | PASS |
| `/api/v1/catalog/bootstrap` | 7.30 ms | 9.23 ms | < 750 ms | PASS |
| `/api/v1/catalog/products` | 6.58 ms | 7.65 ms | < 750 ms | PASS |

Desktop local sale/refund persistence is covered by the local-store smoke and completes synchronously within its sub-second target. Full Electron launch-to-usable timing needs an interactive Windows desktop acceptance run because this environment cannot launch and control the packaged GUI window.

## Defect Register

| ID | Severity | Reproduction And Evidence | Root Cause | Fix | Regression Coverage |
| --- | --- | --- | --- | --- | --- |
| QA-001 | P1 | Finalized offline desktop sale left the cached product stock unchanged. | `persistOfflineSale` queued the sale but did not mutate the local stock snapshot. | Added local sale cache adjustment for simple and variant stock, including parent stock recalculation. | `npm run test:desktop:local` verifies decrement, refund restoration, queue durability, and receipt persistence. |
| QA-002 | P2 | XP-T361U-targeted receipt HTML used 76 mm despite a 72 mm printable receipt profile. | Receipt CSS used the wrong paper width. | Set `@page` and body width to 72 mm with border-box sizing. | Desktop smoke asserts the exact page/body constraints. |
| QA-003 | P2 | Size guide dialog could block product actions without responding to Escape. | Modal had click-close only. | Added keyboard Escape handling while the size guide is open. | Customer QA opens a bottoms size guide, validates its columns, presses Escape, and completes Buy Now. |
| QA-004 | P2 | WebKit tablet emulation rendered a blank SPA at local HTTP. | Helmet emitted `upgrade-insecure-requests` and HSTS for local HTTP, causing WebKit to request local assets through HTTPS. | Keep these headers for production only; disable them in local/test HTTP mode. | WebKit iPad and Pixel/Chromium QA suites pass after the fix. |
| QA-005 | P2 | Non-destructive QA could leave or remove the wrong records. | Earlier checks lacked a dedicated data prefix and cleanup utility. | Added generated QA prefixes, cleanup utility, and live-safe Playwright configuration. | Every QA browser command reports the removed prefix after completion. |
| QA-006 | P2 | `prisma validate` could fail to find the local database environment. | Prisma command did not load `backend/.env.local`. | Added `db:validate` wrapper using the backend environment. | `npm run db:validate` passes. |
| QA-007 | P2 | Root lint scanned generated Electron/runtime artifacts and backend lint used incompatible dependency resolution. | One root lint command crossed project boundaries; backend ESLint packages were mismatched after dependency upgrades. | Excluded generated output, scoped root lint to frontend source, aligned backend ESLint TypeScript packages, and removed obsolete disable comments. | Root lint has 0 errors; backend lint passes cleanly. |
| QA-008 | P1 | Production audit contained vulnerable/unneeded packages and spreadsheet parsing added unnecessary attack surface. | Stale build packages and an XLSX parser were included in the runtime dependency graph. | Removed unused runtime packages, updated dependencies, and restricted catalog imports to bounded CSV parsing (max 5,000 rows). | Import smoke accepts CSV and rejects XLSX; production audit has 0 high/critical findings. |

## QA Data Cleanup Manifest

The following QA datasets were created and selectively removed by `backend/src/tests/cleanup-qa.ts`:

| Suite | Final Run Prefix | Cleanup |
| --- | --- | --- |
| Smoke | `qa-smoke-ms02e0ok` | Completed |
| Final smoke after WebKit fix | `qa-smoke-ms031zyk` | Completed |
| Regression | `qa-regression-ms02pyev` | Completed |
| Live-safe | `qa-live-ms02h2qm` | Completed |
| Customer | `qa-customer-ms02eii7` | Completed |
| Edge | `qa-edge-ms02ta88` | Completed |
| Tablet retry | `qa-tablet-ms02ys4q` | Completed |
| Mobile | `qa-mobile-ms02z111` | Completed |

The earlier failed tablet prefix `qa-tablet-ms02u5t8` was also cleaned automatically. No base catalog, order, customer, employee, or persisted desktop data was intentionally deleted.

## Product And Security Notes

- Import is intentionally **CSV-only** for now. Convert XLS/XLSX spreadsheets to CSV before upload. The importer rejects non-CSV files and caps input at 5,000 rows.
- Production audit result: three low transitive development advisories (`@babel/core`, `body-parser`, `esbuild`); zero moderate, high, or critical advisories. No high/critical production dependency is known.
- Frontend lint reports 16 existing non-failing advisories: Fast Refresh export layout and Hook dependency stability. They do not block build or test behavior, but should be reduced in a code-quality pass.
- The repository no longer contains an unused Cloudflare Wrangler runtime configuration. The supported runtime remains the single Express/Hostinger deployment model.

## Hardware And Deployment Acceptance Checklist

These checks are deliberately **not** marked passed because they require real external systems or interactive hardware:

- [ ] Run the built installer on a clean Windows PC with Node, Git, and Docker absent.
- [ ] Measure actual Electron launch, login, POS readiness, and sign-in timing on that PC.
- [ ] Select the real Xprinter XP-T361U in Windows and print a 72 mm receipt.
- [ ] Check paper feed, cutter behavior, margins, barcode/QR scan quality, printer-unavailable handling, and reprint behavior on the physical printer.
- [ ] Validate the 76 mm physical label workflow and raw ESC/POS/TSPL requirements if that printer mode is enabled for launch.
- [ ] Code-sign the Windows installer and set a production application icon before client distribution; the package build correctly reported that signing was skipped.
- [ ] Test the exact Node 20.x runtime used by Hostinger; this local verification ran on Node 24.11.0.
- [ ] Deploy to Hostinger staging, run migrations/seed checks, verify HTTPS/cookies/custom domain, and confirm uploads survive a redeploy.
- [ ] Run a real offline day: disconnect the billing PC, create sales/refunds, restart the desktop app, reconnect, and reconcile cloud inventory, receipts, and commissions.
- [ ] Validate the final storefront on physical Android and iOS devices.

## Release Recommendation

**Local release gate: PASS, conditional.** No open reproducible P0 or P1 application defect remains in this QA run. Builds, schema validation, health checks, backend services/integration, non-destructive browser QA, POS reconciliation coverage, local desktop persistence, and Windows installer packaging all pass.

Do not mark the customer release as fully production-approved until the external acceptance checklist above is completed, especially Node 20/Hostinger staging, physical XP-T361U validation, an offline/reconnect desktop reconciliation run, and Windows code signing.
