# Bilal RMS Full QA Report

**Run ID:** `QA-20260828-LOCAL-AUDIT`

**Date:** 28 August 2026

**Scope:** Local, non-destructive audit of storefront, admin, hosted POS, backend, MariaDB logic, and Windows Electron POS.

**Exclusions:** No Git push, Hostinger deployment, production database access, or desktop release publication was performed.

## Environment And Baseline

| Item | Evidence |
| --- | --- |
| Workspace | `F:\hashir\bilal-rms` |
| Baseline revision | `8086920` on `main`; audit changes are intentionally uncommitted |
| Runtime used | Windows 11, Node `24.11.0`, npm `11.6.1` |
| Declared package manager | npm `10.8.2` |
| Local database | Existing Docker MariaDB at `127.0.0.1:3308` |
| Web target | Local production build at `http://127.0.0.1:5000` |
| ORM | Prisma `7.10.0`; generated client checked through schema validation and migration deployment |
| Desktop | Bilal RMS `0.3.1`, Electron `43.2.0` |
| Installer | `desktop/dist/BilalRMS-Setup-0.3.1.exe`, 105,222,844 bytes |
| Installer SHA-256 | `967DA0DF0C38B5B7F18FDDA5A10DC6CDB1506E2EC33559791525BE52AED63003` |
| Installer signature | `NotSigned` |

The existing MariaDB volume and desktop SQLite data were retained. Browser and integration writes used generated `qa-*` or `int-*` identifiers and cleanup in `finally`. No destructive reset was run.

## Release Test Matrix

| Area | Command / method | Result | Evidence |
| --- | --- | --- | --- |
| Root clean install | `npm ci` | PASS | Postinstall generated Prisma client and built client/server |
| Desktop clean install | `npm ci` in `desktop/` | PASS | Dependency tree installed; only transitive build-tool deprecation notices |
| Frontend lint | `npm run lint` | PASS | No errors or warnings |
| Backend lint | `npm run lint:backend` | PASS | No errors or warnings |
| Client/backend build | `npm run build` | PASS | Vite production output and backend TypeScript compiled |
| Prisma schema | `npm run db:validate` | PASS | Prisma 7 schema/config accepted |
| Local migrations | `npm run db:deploy` | PASS | No pending migration failure; employee/account migration present |
| Architecture | `npm run check:architecture` | PASS | Protected controller structure accepted |
| Deferred routes | `npm run check:deferred-routes` | PASS | No unsupported admin menu route exposed |
| Backend domain tests | `npm run test:backend:services` | PASS | Inventory, reporting, POS, employee security, catalog zero values |
| Backend integration | `npm run test:backend:integration` | PASS | Auth, CSRF, RBAC, employee revocation, checkout, POS/refund, sync idempotency |
| Import validation | `npm run test:backend:imports` | PASS | Supported import path and rejected invalid files |
| Web smoke | `npm run test:qa:smoke` | PASS | Final rerun: 3 tests in 10.3 s; admin product create, 12-to-15 inventory adjustment, POS/refund and storefront |
| Retail regression | `npm run test:qa:regression` | PASS | Product/employee creation, attributed sale, refund and commission reversal |
| Full local write suite | `npm run test:qa:live` | PASS | 6.1 s; sticker setup, variant matrix, storefront, POS, receipt, commissions, invoice lookup/void |
| Customer Chrome | `npm run test:qa:customer` | PASS | Search/no-result, categories, sorting, size guide, Buy Now, cart/wishlist |
| Microsoft Edge | `npm run test:qa:edge` | PASS | Customer flow and responsive behavior |
| Tablet emulation | `npm run test:qa:tablet` | PASS | iPad/WebKit project |
| Mobile emulation | `npm run test:qa:mobile` | PASS | Pixel/Chromium project |
| Read-only smoke | `npm run test:e2e:live` | PASS | Read-only target guard; no product, order, employee, or finance mutation |
| Dependency audit | `npm audit --audit-level=high` | PASS | 0 vulnerabilities in root tree |
| Desktop dependency audit | `npm audit --audit-level=high` in `desktop/` | PASS | 0 vulnerabilities |
| Desktop local persistence | `npm run test:desktop:local` | PASS | Offline sale/refund, stock, receipt, queue and restart persistence |
| Desktop update feed | `npm run test:desktop:update` | PASS | Local N to N+1 discovery, checksum/size and no-downgrade behavior |
| Packaged desktop launch | Packaged executable smoke against local backend | PASS | Startup 1,722.9 ms; sign-in 317.9 ms; POS ready 309.5 ms |
| Desktop package | `npm run desktop:pack` | PASS | Unpacked Windows application built |
| Windows installer | `npm run desktop:dist` | PASS | NSIS installer built; signing correctly reported absent |
| Diff integrity | `git diff --check` | PASS | No whitespace errors; Git only reported line-ending conversion notices |

## Performance Results

Budgets: local API p95 under 750 ms, page usable under 3,000 ms, Electron usable under 4,000 ms, local POS persistence under 1,000 ms, and visible UI feedback under 250 ms.

| Measurement | Result | Budget | Status |
| --- | ---: | ---: | --- |
| `/api/v1/health` p95 | 2.4 ms | 750 ms | PASS |
| `/api/v1/categories` p95 | 7.4 ms | 750 ms | PASS |
| `/api/v1/catalog/settings` p95 | 2.6 ms | 750 ms | PASS |
| `/api/v1/catalog/bootstrap` p95 | 8.8 ms | 750 ms | PASS |
| Catalog products p95 | 6.0 ms | 750 ms | PASS |
| Home usable state | 659.1 ms | 3,000 ms | PASS |
| Shop usable state | 60.7 ms | 3,000 ms | PASS |
| Search usable state | 43.7 ms | 3,000 ms | PASS |
| Shop list-view feedback | 87.4 ms | 250 ms | PASS |
| Electron usable state | 1,722.9 ms | 4,000 ms | PASS |
| Desktop local sale persistence | about 5.6 ms | 1,000 ms | PASS |
| Desktop local refund persistence | about 4.3 ms | 1,000 ms | PASS |

The first home timing immediately after dependency installation was 3,440 ms, but two warm production-build reruns measured about 594 ms and 596 ms and the final gated run measured 659.1 ms. The initial result was not reproducible and is treated as build/startup warm-up, not an open regression.

## Defect Register

| ID | Severity | Defect / root cause | Resolution and regression evidence |
| --- | --- | --- | --- |
| QA-101 | P1 | Managers could provision employee login credentials, allowing role boundary escalation. | Credential fields and API mutations are admin-only; role escalation tests pass. |
| QA-102 | P1 | Employee and STAFF account changes were not atomic and archive did not reliably revoke linked login access. | Added optional unique Employee-to-AdminAccount relation, transactional provisioning/update, account deactivation and session revocation. |
| QA-103 | P1 | Online pending/processing/shipped orders could be counted as recognized revenue/profit. | Online revenue now recognizes only `DELIVERED`; operational order count remains separate. Reporting regressions cover pending exclusion and delivery recognition. |
| QA-104 | P1 | POS cashier identity could be inferred from the first attributed salesperson on mixed-employee bills. | Added explicit cashier account relation and separate line-level salesperson reporting. Mixed-employee test passes. |
| QA-105 | P1 | Refund display references were not guaranteed unique for multiple refunds on one invoice. | Refunds now receive unique displayed references; repeated-refund coverage passes. |
| QA-106 | P1 | Write-enabled QA could be pointed at a remote URL and leave business records. | Local destructive guard, read-only remote suite, `finally` cleanup, and expanded register/sync cleanup implemented. |
| QA-107 | P2 | Product validation used truthiness and could replace explicit zero price/cost; repository error handling could hide database failures. | Explicit null checks preserve zero values and database exceptions propagate. Service tests cover zero-value fields. |
| QA-108 | P2 | Currency fallback ran only for a narrow failure path. | Secondary provider now handles network errors, non-success responses and malformed payloads; cached/fallback source is identified. CSP allows only the two configured providers. |
| QA-109 | P2 | Standalone Size Guides navigation exposed deferred/duplicate management. | Removed the menu entry; supported per-product size-guide editing remains. Deferred-route check passes. |
| QA-110 | P2 | Browser tests used stale product/barcode controls and could scan before the asynchronous POS catalog bootstrap completed. | Locators now match current labels and preset color workflow; scanner simulation waits for catalog readiness. Sticker controls gained programmatic labels. All browser projects pass. |
| QA-111 | P2 | Desktop smoke could reuse operator SQLite state and did not prove update persistence/idempotency. | Tests use isolated temporary profiles, clean them, verify restart persistence, exactly-once sync, and a local N/N+1 update feed. |
| QA-112 | P2 | Insecure default admin credentials could be accepted from source defaults. | `ADMIN_EMAIL` and `ADMIN_PASSWORD` are mandatory environment values; no demo credential is rendered or embedded. |
| QA-113 | P2 | Prisma 5/runtime dependency state contained stale tooling and audit noise. | Migrated to Prisma 7 generated client/config, aligned lockfiles, moved test runners to `tsx`, and updated dependencies. Both audits report zero vulnerabilities. |
| QA-114 | P2 | Sticker design, roll size, dimensions and orientation had visible labels without accessible associations. | Added explicit control IDs/labels; live Playwright selection now uses the visible labels. |

No reproducible P0 or P1 defect remains open in this local run.

## Finance, Inventory And Cleanup Reconciliation

- Online sales contribute revenue and profit only after `DELIVERED`; pending through shipped remain operational counts.
- POS sale, void/refund, inventory movement, receipt and commission paths were exercised together and reconciled by service/integration/browser tests.
- Line salesperson and bill cashier are stored/reported independently.
- Offline sale decrements cached stock; refund restores it; both survive restart and queue exactly once for sync.
- Browser wrappers reported cleanup for every final prefix, including the latest product/inventory verification `qa-smoke-mtd3xiyk`, `qa-regression-mtcl6rf8`, `qa-customer-mtcl6zmr`, `qa-edge-mtcl74nb`, `qa-tablet-mtcl7b1v`, `qa-mobile-mtcl7jej`, and `qa-live-mtd2u2dg`.
- Failed retries `qa-smoke-mtd3sqwj`, `qa-live-mtd2lbui`, and `qa-live-mtd2qbwc` were also cleaned automatically.
- Integration fixtures cleaned their own `int-*` records in `finally`; desktop tests removed isolated temporary profiles.
- No existing business catalog, customer, order, inventory, finance, or desktop operator record was intentionally removed.

## Residual And External Acceptance

These items are not software passes and must remain open until tested on the actual target:

- [ ] Scan real merchandise labels with the Honeywell Orbit scanner, including unreadable/duplicate scans and sustained counter throughput.
- [ ] Print receipt and 38.1 x 25.4 mm label output through the physical Xprinter/driver; verify feed, cutter, density, barcode/QR scan quality and printer-unavailable recovery.
- [ ] Install on a clean customer Windows PC and verify SmartScreen behavior. The current installer is **not signed**.
- [ ] Complete code signing with a trusted Windows certificate and rebuild before broad distribution.
- [ ] Validate storefront and checkout on physical Android and iOS devices; current mobile/tablet evidence is emulation.
- [ ] Deploy to Hostinger staging/production only after approval, then verify Node 20 runtime, migrations, secure cookies, HTTPS, custom domain, database connectivity and runtime logs.
- [ ] Confirm Hostinger preserves `storage/uploads` and `storage/desktop` across redeploy/restart and validate backup/restore procedures.
- [ ] Run the final physical offline/reconnect day test and reconcile hosted stock, receipts, refunds, commissions and duplicate-job prevention.

The latest `electron-builder` still emits deprecation notices from transitive packaging tools (`inflight`, legacy `glob`/`rimraf`, and `boolean`). They are build-time dependencies, both audits are clean, and forced overrides would risk packaging behavior. Track upstream replacement as P3 maintenance.

## Release Recommendation

**Local release candidate: PASS, conditional on external acceptance.** All local build, schema, security, data-integrity, browser, POS, performance, desktop persistence, update-feed and packaging gates pass. No unexplained test failure or backend 500 remained in the final run, and no P0/P1 defect is open.

This report does **not** authorize or claim a production deployment. Hostinger verification, physical scanner/printer testing, real mobile-device testing, clean-client installation and trusted Windows signing remain required release acceptance work.
