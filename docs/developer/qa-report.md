# Bilal RMS Full QA Report

## 4 September 2026: Exchanges, Vendor Ledgers, Bills And Printer Profiles

**Scope:** Implement the approved client billing release locally, validate it on an isolated MariaDB schema and local Electron profile, then deploy web/backend before publishing desktop `0.4.0`. The release does not modify production business records during QA.

- Added atomic partial/full POS exchanges with higher-price collection, lower-price refund, equal-value settlement, quantity/concurrency guards, stock movements, linked source/replacement invoices, ledger entries, replacement commission attribution, and idempotency keys. Offline Electron exchanges persist in SQLite across restart and synchronize exactly once.
- Replaced negative commission reversal creation with non-negative cancellation tracking. Unpaid earned amounts can be partially or fully cancelled; paid commission is preserved. Historical negative reversal rows are retained as zero-value cancelled audit rows and their original notes are not deleted.
- Added nullable vendor linkage to ledger entries, automatic purchase/correction assignment, migration backfill, optional vendor selection for manual entries, and Main Ledger/Vendor Ledgers views with dates, debit, credit, balance and entry count. Foreign keys use `ON DELETE SET NULL`.
- Standardized browser, PDF and Electron receipts to 72 mm paper, approximately 66 mm printable content and 3 mm padding. The receipt heading is exactly `BILAL GARMENTS`. New and existing receipts receive unique `BI-XXXX` Code 128 lookup codes without changing legacy invoice/receipt/sale identifiers; POS and Admin Invoice search route scans to the matching invoice rather than the product cart.
- Added local per-PC Receipt Printer and Sticker Printer profiles with installed-printer discovery, dimensions, offsets, gap, copies, orientation and sticker design. Electron prints directly to the saved device; browser printing retains the system dialog and remembers layout values locally. Windows driver heat, speed, cutter and sensor settings remain outside application control.

### Local Verification

| Gate | Result | Evidence |
| --- | --- | --- |
| Fresh migration deployment | PASS | All 17 migrations applied to isolated `bilal_rms_exchange_test`; Prisma schema valid |
| Backend service regression | PASS | Equal/higher/lower exchanges, partial quantities, idempotency, stock, lookup codes, vendor ledgers and non-negative commission cancellation |
| Backend integration | PASS | Full authenticated API suite passed after replacing the obsolete reversal assertion; cleanup completed |
| Client/server build | PASS | Vite production bundle and backend TypeScript compiled |
| Frontend/backend lint | PASS | No errors or warnings |
| Architecture/deferred routes | PASS | Both route checks passed |
| Dependency audit | PASS | Root npm audit reports 0 vulnerabilities |
| Desktop persistence | PASS | Offline sale 6.4 ms, refund 4.1 ms, exchange 5.3 ms; queue and printer profiles survived restart |
| Browser smoke | PASS | 3 tests in 13.9 s; scoped records removed |
| Retail regression | PASS | 1 test in 6.5 s; scoped records removed |
| Receipt/invoice workflow | PASS | 1 test in 6.9 s; `BI-XXXX` lookup exercised and scoped records removed |
| Diff integrity | PASS | No whitespace errors; only existing CRLF normalization notices |

### Release Status And External Acceptance

- Desktop package version is `0.4.0`. The local unsigned installer is `desktop/dist/BilalRMS-Setup-0.4.0.exe`, 105,232,149 bytes, SHA-256 `152323EEA589DF46633B95117F1335554F2CF1194F0C8B513DFA88976A1BB1D7`. Hostinger deployment, GitHub verification, update-feed verification, and live health results are pending release execution.
- The default retained local `bilal_rms` schema contains an old failed migration record. It was not altered; all write-enabled verification used the isolated `bilal_rms_exchange_test` schema.
- Physical scanner and printer acceptance remains open: print a real 72 mm receipt and configured sticker, verify XP-T361U feed/cutter/density, then scan both Code 128 symbols into Notepad and the correct application lookup. Screen scanning is not accepted as proof for the 1D Orbit laser scanner.
- The Windows installer remains unsigned until a trusted signing certificate is supplied.

## 3 September 2026: Deployment Results

The user explicitly authorized deployment after the local checks below. Scope: completed POS lookup/catalog fixes, short barcode generation and print layouts, and commission payable double-deduction correction. Commission reversal removal remains excluded pending clarification. Earlier local-only notes describe the state before this authorization.

- Application release `ad06c1c` and test-isolation correction `e38c92f` pushed to `main`.
- GitHub [Build Verification 33763405286](https://github.com/heyhashir/bilal-rms/actions/runs/33763405286) PASS: clean install, dependency audit, frontend/backend lint, Prisma validation, full build and both database-free regression tests. Initial run 33763096956 failed only because an unused file-maintenance dependency loaded required admin environment values; stubbing that unrelated dependency removed the test's accidental reliance on local credentials. Production credential requirements were not weakened.
- Live frontend serves the matching `/assets/index-DTquDUIv.js`. `/api/v1/health/ready` and `/api/v1/catalog/bootstrap` returned 200. Authenticated `/admin/barcodes/generate` with `format: short` returned the new two-letter/four-digit format. Generated code was not saved. No product, stock, sale, refund, employee or commission record was changed during verification.
- Desktop 0.3.4 published and server-checksummed after the final code deployment: 105,225,988 bytes; SHA-256 `948494745534348ae1055e30dc8ecc32ed3177bcfd23860f69442a3eb8d9a457`. The update manifest offers it to 0.3.3, suppresses a repeat offer to 0.3.4, and exposes the correct file size/hash. Installer HEAD returned 200 with matching content length. Unique unregistered device keys were used for read-only manifest checks; no device was created. Actual client installation and physical scanning were not attempted; installer remains unsigned.
- **Observed deployment risk:** The first upload passed server verification, but the overlapping follow-up Hostinger deployment removed its installer/metadata, causing `available: false`. The admin release endpoint confirmed `published: false`, `size: null`, `metadata: null`. Re-uploading after all code pushes restored availability and passed the checks above. The release directory does not survive this redeployment flow. Durable release storage needs a separate fix; until then publish after every final deployment and verify the feed.
- Final evidence changes are intentionally local/uncommitted; another documentation push would trigger an unnecessary deployment and could remove the published installer again. Source/test changes are fully pushed. No additional deployment is pending from this task.

## 3 September 2026: Commission Report Calculation (Historical; Superseded)

- Confirmed paid entries were deducted twice in total, employee and product commission payable: the `earned` accumulator excludes PAID entries, but the calculation still subtracted `paid`. Changed payable to `earned + reversed` while retaining the existing reversal policy until the user's compensation-rule answer.
- Backend build and `node --test scripts/tests/commission-summary.test.mjs` pass. Fixtures verify paid-only 118 yields payable 0, then adding unpaid 50 yields payable 50 at all three aggregation levels. No database is loaded or modified.
- At the time of this run, removal of commission reversals was not implemented because the compensation rule was awaiting clarification. The 4 September release above supersedes this state with unpaid cancellation and paid-commission preservation.

## 3 September 2026: Short Codes And Scannable Label Layout (Local Only)

- The supplied printed `COTTONJEAN-BEI-26` label has dense, short bars. Code inspection confirmed one-pixel canvas modules with minimal quiet zones, scaled into a fixed small label; the standalone print document also lacked compact/branded layout styles. These are software defects independent of whether a particular scanner can read a phone screen.
- Generated product and variant barcode values now use two uppercase letters, a hyphen, and four digits, for example `BA-1234`: six alphanumeric characters, seven displayed characters. The letters vary to avoid a fixed-prefix 10,000-code limit. API generation checks product and variant barcodes for collisions; the editor excludes codes already in its loaded catalog and draft. Database uniqueness remains enforced on save. Legacy/numeric API formats remain explicitly available for compatibility.
- Existing saved codes are preserved on reprint. Admin can explicitly generate short product or variant barcodes, confirm replacement, and Save. SKU, size, color, stock and existing QR values remain unchanged by the short-barcode replacement buttons. Replacement invalidates cached sticker data; previously printed barcode stickers need replacing. No bulk rewrite, local/production database mutation, or migration was performed during these fixture tests.
- Sticker barcodes are vector Code 128 with 0.25 mm modules, 10-module white quiet zones on each side, and 8 mm bar height. `BA-1234` occupies 30.25 mm including quiet zones and fits the 38 x 25 mm profile. The long example requires at least a 63 mm-wide label at this profile. Unsafe/invalid output is blocked rather than squeezed. Preview and standalone browser/Electron print HTML share explicit layout styles across standard, compact and branded templates; branded Code now shows the short barcode, not the long SKU.
- Verification: `npm run build` passed frontend and backend compilation; focused ESLint passed; `git diff --check` passed (Git only warned of existing CRLF normalization). `node --test scripts/tests/sticker-codes.test.mjs` passed generation/collision retry, default format, existing-code preservation, independent missing-variant code assignment, and retained SKU/stock/QR. Three isolated Playwright tests passed in 14.2 seconds using `playwright.stickers.config.ts`: all template geometry/quiet zones, unsafe long-label blocking, and confirmation/Save/cache-refresh behavior. API requests and database methods were mocked, so no data cleanup was needed. This does not resolve the unrelated full frontend TypeScript diagnostics listed below.
- Preview evidence: `test-results/stickers/printing-short-barcode-pri-76a51-es-and-all-template-layouts/short-barcode-preview.png` (synthetic QA product, not a live sellable barcode).
- Hardware acceptance remains OPEN: print one updated label at actual size/100%, matching the physical roll, no margins or browser headers/footers. Scan into Notepad first to distinguish optical decode from POS lookup. Orbit MS7120 is a 1D laser device; a failed phone-screen scan is not proof of an invalid label. [Honeywell's Orbit 7190g documentation](https://automation.honeywell.com/us/en/products/productivity-solutions/barcode-scanners/presentation-scanners/orbit-7190g-hybrid-presentation-scanner) identifies its additional area imager as the capability for smartphone barcode reading. No claim of successful physical scanning or printing is made.
- Desktop `0.3.4` rebuilt successfully with the same bundled frontend: `desktop/dist/BilalRMS-Setup-0.3.4.exe`, 105,225,988 bytes, SHA-256 `948494745534348AE1055E30DC8ECC32ED3177BCFD23860F69442A3EB8D9A457`, Authenticode `NotSigned`. This replaces the earlier local-only 0.3.4 artifact. The new format API needs the matching backend when released. No Git push, Hostinger deployment, installer publication or installation occurred.

## 3 September 2026: POS Catalog And Scanner Correction (Local Only)

- Production diagnosis was read-only apart from authentication. `/sync/bootstrap` without a device key returned 27 active products. No device was registered and no sale, refund, inventory, or product record was written. In the live browser, `T-shirt 0002` was incorrectly reported as missing because its stock is zero; `COTTON JEANS 0002` selected the first out-of-stock variant, while exact `COTTONJEAN-BLA-24` lookup successfully added the variant to the unsaved bill.
- POS now displays a browsable catalog and product count, keeps zero-stock items visible with an explicit out-of-stock message, excludes archived products, and supports parent barcode/QR and supplier codes. Ambiguous names/codes offer variant selection rather than arbitrarily choosing the first row. Exact variant scans still add directly; zero price overrides remain zero.
- Added explicit Refresh products, refresh on focus/reconnect, and a one-minute visible-window refresh. Queued offline bills/refunds are synchronized before replacing cached inventory; a failed sync preserves local stock and queues. Failed catalog requests keep the prior catalog and display the error. Refresh no longer steals focus from customer fields.
- Scanner input is handled once per Enter. The global keyboard-burst listener no longer resets on each render and does not intercept other text fields. Unknown codes leave a visible no-results state.
- Eight fixture-only browser checks passed across web and desktop-bridge renderer modes (14.8 seconds). The queued-stock checks were rerun after preserving automatic queue sync and both passed (6.7 seconds). All API calls were intercepted; no Docker startup/reset, real checkout, or production mutations occurred. Command: `node node_modules/@playwright/test/cli.js test --config playwright.pos.config.ts`.
- Focused ESLint and the Vite production build pass. Full frontend `tsc --noEmit` does **not** pass: existing diagnostics remain in ProductCard, inventory API, bill-wise/valuation/inventory/ledger/report/supplier screens, and checkout. No errors were reported in the changed POS route/helper. These unrelated diagnostics are not resolved by this narrow fix.
- Physical scanner testing remains unperformed. [Honeywell's Orbit MS7120 specification](https://automation.honeywell.com/us/en/products/productivity-solutions/barcode-scanners/presentation-scanners/orbit-7120-hands-free-scanner) is 1D laser, not QR/2D: use the striped barcode on the app's sticker. A 2D scanner is required for QR reading; software cannot add that optical capability.
- Desktop version is prepared as `0.3.4`. Publication is explicitly withheld at the user's request: no Git push, Hostinger deployment, desktop feed update, or local installation. Production remains on the prior release.

## 3 September 2026: Vendor Purchases Correction

- The history screen dereferenced nested vendor/product fields although the API returns flat `vendorName`, `productName`, and `variantSku` fields. Both row totals and the wholesale-spend summary also referenced a nonexistent `totalCost` field. Rows and summaries now calculate quantity times unit cost; reversed purchases remain excluded from active totals.
- Three isolated browser tests pass: flat records/filtering/reversal/zero costs, purchase submission and refreshed totals, and failed-request retry. They intercept API requests and never start or reset a database. Run with `node node_modules/@playwright/test/cli.js test --config playwright.vendor-purchases.config.ts`.
- Frontend production build and backend TypeScript build pass. The npm 10 strict-install dry run passes; targeted `mysql2@3.24.3` and `qs@6.16.0` resolution produces zero audit findings. Express remains on version 4; the abandoned major upgrade and broad lockfile changes were removed.
- **Local data incident:** the legacy regression harness was run before reassessment and invoked `--reset-db`, removing/recreating the local Docker MariaDB volume. The previous local contents were not captured, so data preservation cannot be claimed for that run. Production was not reset. The runner was stopped and its automatic reset flag removed. Do not run legacy write suites against retained business data; use isolated fixtures or the scoped QA wrappers.
- Release code `b3a4bb3` is pushed; GitHub Build Verification run `33748882070` passed. The live page rendered all 31 existing purchase records, its active wholesale total matched the API records, and no browser exceptions occurred. The live check made no business-data writes.
- Desktop `0.3.3` is published and server-verified: `desktop/dist/BilalRMS-Setup-0.3.3.exe`, 105,224,288 bytes, SHA-256 `bbeb8007189cd1bd19745878d2bd61d755772a39d5d253e8a0d32ce4bb78a50b`. It bundles the corrected page; a new full desktop regression was not run for this UI fix.

The release evidence below describes the earlier August run, not this correction.

**Run ID:** `QA-20260831-RELEASE-VALIDATION`

**Date:** 31 August 2026

**Scope:** Local release regression of storefront, admin, hosted POS, backend, MariaDB schema recovery, and Windows Electron POS, followed by controlled production deployment validation.

**Exclusions:** Physical scanner/printer behavior, trusted Windows signing, and real mobile hardware remain external acceptance checks. Production verification must use scoped `qa-*` data and remove it after testing.

## Environment And Baseline

| Item | Evidence |
| --- | --- |
| Workspace | `F:\hashir\bilal-rms` |
| Baseline revision | `552e379` on `main`; release changes were validated before commit |
| Runtime used | Windows 11, Node `24.11.0`, npm `11.6.1` |
| Declared package manager | npm `10.8.2` |
| Local database | Existing Docker MariaDB at `127.0.0.1:3308` |
| Web target | Local production build at `http://127.0.0.1:5000` |
| ORM | Prisma `7.10.0`; generated client checked through schema validation and migration deployment |
| Desktop | Bilal RMS `0.3.2`, Electron `43.2.0` |
| Installer | `desktop/dist/BilalRMS-Setup-0.3.2.exe`, 105,224,098 bytes |
| Installer SHA-256 | `8EB19CD7C850CFB56D83AAEAF9F831B654A58E089FA2D17B3B745CBEF57DFE0D` |
| Installer signature | `NotSigned` |

The release Playwright runs used an isolated/recreated local MariaDB test volume. Integration writes used generated `qa-*` or `int-*` identifiers and cleanup in `finally`. Production business data was not reset. Desktop SQLite smoke tests used isolated temporary profiles and did not alter an installed operator profile.

## Release Test Matrix

| Area | Command / method | Result | Evidence |
| --- | --- | --- | --- |
| Root clean install | `npm ci --ignore-scripts` | PASS | 714 packages installed from the committed lockfile; Prisma generation/build were then run explicitly |
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
| Desktop local persistence | `npm run test:desktop:local` | PASS | Offline sale 6.3 ms, refund 3.6 ms, stock, receipt, queue and restart persistence |
| Desktop update feed | `npm run test:desktop:update` | PASS | Local N to N+1 discovery, checksum/size and no-downgrade behavior |
| Packaged desktop launch | Packaged executable smoke against local backend | PASS | Startup 1,722.9 ms; sign-in 317.9 ms; POS ready 309.5 ms |
| Desktop package | `npm run desktop:pack` | PASS | Unpacked Windows application built |
| Windows installer | `npm run desktop:dist` | PASS | NSIS installer built; signing correctly reported absent |
| Diff integrity | `git diff --check` | PASS | No whitespace errors; Git only reported line-ending conversion notices |

## Performance Results

Budgets: local API p95 under 750 ms, page usable under 3,000 ms, Electron usable under 4,000 ms, local POS persistence under 1,000 ms, and visible UI feedback under 250 ms.

| Measurement | Result | Budget | Status |
| --- | ---: | ---: | --- |
| `/api/v1/health` p95 | 3.3 ms | 750 ms | PASS |
| `/api/v1/categories` p95 | 15.3 ms | 750 ms | PASS |
| `/api/v1/catalog/settings` p95 | 4.6 ms | 750 ms | PASS |
| `/api/v1/catalog/bootstrap` p95 | 21.2 ms | 750 ms | PASS |
| Catalog products p95 | 11.2 ms | 750 ms | PASS |
| Home usable state | 941.6 ms | 3,000 ms | PASS |
| Shop usable state | 98.8 ms | 3,000 ms | PASS |
| Search usable state | 82.3 ms | 3,000 ms | PASS |
| Shop list-view feedback | 115.7 ms | 250 ms | PASS |
| Electron usable state | 1,722.9 ms | 4,000 ms | PASS |
| Desktop local sale persistence | 6.3 ms | 1,000 ms | PASS |
| Desktop local refund persistence | 3.6 ms | 1,000 ms | PASS |

The first home timing immediately after starting the browser was 4,046.3 ms. The immediate repeat measured 941.6 ms while all other routes stayed below 102 ms, so the isolated result is recorded as browser cold-start overhead rather than a reproducible homepage regression.

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
| QA-115 | P1 | Hostinger could report migrations as applied while restored tables still lacked additive product, variant, inventory, employee and cashier columns, causing catalog/admin API 500 responses. | Added an additive production schema reconciler, a missing `product_variants.image` migration, and readiness checks for critical columns. Fresh-schema and integration tests pass. |
| QA-116 | P2 | Storefront/admin query failures could be rendered as empty product, inventory, purchase, or report data, hiding backend failures. | Added explicit retryable query-error states and disabled dependent mutations while reference data is unavailable. |
| QA-117 | P2 | Desktop POS could remain blocked by catalog bootstrap failure and checked for updates only after bootstrap succeeded. | Bootstrap failure now exposes retry/offline-safe behavior and update checks execute independently; local store and N/N+1 tests pass. |
| QA-118 | P2 | Playwright retained demo admin credential fallbacks. | Test authentication now requires environment credentials and the config loads only the two required values from the ignored local env file. |
| QA-119 | P2 | Prisma's MariaDB adapter resolved a vulnerable nested connector release. | Hoisted and pinned `mariadb@3.5.3` through npm overrides; root and desktop audits report zero vulnerabilities. |
| QA-120 | P2 deferred | Contact page details differ from admin/store settings. | Intentionally left unchanged at owner request; reconcile the authoritative email/phone in a later content pass. |

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
- Production verification created `qa-release-1788189007119`; create/read/update/archive/restore all passed, but permanent delete correctly returned `409` after stock history existed. The record remains archived (`isActive = false`) and is not visible on the storefront.
- Production update verification registered scoped `qa-update-*` devices. They contain no sales, refunds, payments, or financial entries.

## Production Release Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Source release | PASS | `dd870ee` pushed to `main`; CI workflow hardening followed in `3bbc213` |
| GitHub verification | PASS | Strict `npm ci`, high-severity audit, lint, Prisma validation, and build passed with no annotations |
| Hostinger readiness | PASS | `/api/v1/health/ready` and `/api/v1/catalog/bootstrap` returned `200` |
| Live storefront | PASS | Home, shop, and search rendered with no browser console errors or retry/error fallback state |
| Live admin product | PASS | Create `201`, public read `200`, update `200`, stock persisted as 11, inventory/report reads `200`, archive `200`, hidden read `404`, restore `200` |
| Desktop publication | PASS | `0.3.2`, 105,224,098 bytes, SHA-256 `8EB19CD7C850CFB56D83AAEAF9F831B654A58E089FA2D17B3B745CBEF57DFE0D` |
| Desktop update detection | PASS | A `0.3.1` manifest request returned `available: true`, latest `0.3.2`, and the expected installer URL/hash/size |
| Packaged desktop live smoke | PASS | Warm packaged run: startup 1,853.2 ms, sign-in 499.5 ms, POS ready 422.5 ms |

The first packaged launch after creating `win-unpacked` took 15,036.2 ms and exceeded the 4-second budget. An immediate rerun passed at 1,853.2 ms. This is retained as a cold package extraction/Windows security-scan risk for clean-client acceptance rather than hidden as a pass.

## Residual And External Acceptance

These items are not software passes and must remain open until tested on the actual target:

- [ ] Scan real merchandise labels with the Honeywell Orbit scanner, including unreadable/duplicate scans and sustained counter throughput.
- [ ] Print receipt and 38.1 x 25.4 mm label output through the physical Xprinter/driver; verify feed, cutter, density, barcode/QR scan quality and printer-unavailable recovery.
- [ ] Install on a clean customer Windows PC and verify SmartScreen behavior. The current installer is **not signed**.
- [ ] Complete code signing with a trusted Windows certificate and rebuild before broad distribution.
- [ ] Validate storefront and checkout on physical Android and iOS devices; current mobile/tablet evidence is emulation.
- [x] Deploy to Hostinger and verify migrations, HTTPS, custom domain, database connectivity, readiness and catalog behavior.
- [ ] Confirm Hostinger preserves `storage/uploads` and `storage/desktop` across redeploy/restart and validate backup/restore procedures.
- [ ] Run the final physical offline/reconnect day test and reconcile hosted stock, receipts, refunds, commissions and duplicate-job prevention.

The latest `electron-builder` still emits deprecation notices from transitive packaging tools (`inflight`, legacy `glob`/`rimraf`, and `boolean`). They are build-time dependencies, both audits are clean, and forced overrides would risk packaging behavior. Track upstream replacement as P3 maintenance.

## Release Recommendation

**Production release: PASS, conditional on external acceptance.** All local build, schema, security, data-integrity, browser, POS, performance, desktop persistence, update-feed and packaging gates pass. Hostinger is ready, live catalog/admin operations pass, and desktop `0.3.2` is published. No backend 500 or open P0/P1 defect remains.

Physical scanner/printer testing, real mobile-device testing, clean-client cold-start acceptance, Hostinger storage persistence, and trusted Windows signing remain required release acceptance work.
