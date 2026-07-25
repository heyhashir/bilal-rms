# Bilal RMS 10/10 Improvements Checklist

This file is the canonical checklist for all remaining work needed to take Bilal RMS from its current production-capable state to a disciplined 10/10 system for the agreed scope:

- public storefront
- owner-admin web panel
- browser-based POS terminal
- Hostinger-hosted Node.js app
- Hostinger MySQL/MariaDB as cloud source of truth
- one Windows shop device with offline POS sync

Only check an item when the implementation, tests, and verification path all exist and match the documented behavior.

## 1. Backend Architecture and Code Ownership

### 1.1 Route and module structure

- [x] Split the remaining admin route surface into bounded route modules instead of one oversized `admin.routes.ts`.
- [x] Break admin routing into module files for catalog, orders, inventory, POS, commissions, customers, settings, and sync composition.
- [x] Keep the top-level admin router as a thin composition layer that mounts bounded sub-routers and shared middleware only.
- [x] Keep route files limited to registration, validation, controller delegation, and response shaping only.
- [x] Remove any remaining route-level business orchestration that still crosses domains.
- [x] Remove any remaining transitional allowlist exceptions from architecture checks except truly infrastructure-only routes.
- [x] Keep each backend module aligned to one clear owner: routes, controllers, services, repositories, serializers, schemas.

### 1.2 Domain service maturity

- [ ] Introduce explicit typed service result contracts instead of leaking raw Prisma records upward.
- [ ] Standardize transaction helpers so all multi-step writes use the same pattern.
- [ ] Ensure every transactional workflow lives in one service owner, not split across services or controllers.
- [ ] Eliminate broad "utility" logic that really belongs to catalog, orders, inventory, POS, commissions, sync, or settings.
- [ ] Audit error ownership so validation, domain-rule, and infrastructure failures are clearly separated.

### 1.3 Repository and serializer discipline

- [x] Move admin dashboard and customer aggregation reads behind repository-owned query composition.
- [x] Ensure repositories own all Prisma query composition for their module.
- [x] Ensure serializers own all outward DTO shaping for their module.
- [ ] Remove remaining backend responses that still mirror internal persistence shapes rather than explicit DTOs.
- [x] Standardize list/detail response envelopes for admin-heavy APIs.
- [x] Add consistent pagination, filtering, and sorting contracts for orders, POS sales, commissions, customers, and inventory history.

## 2. Frontend State and API Contract Quality

### 2.1 TanStack Query completion

- [x] Remove any remaining server-backed Zustand patterns outside true client-local concerns.
- [x] Keep Zustand limited to cart, auth snapshot, POS local draft state, and local-only preferences.
- [x] Ensure every server-backed screen loads from an authoritative query, not from side-effect hydration.
- [ ] Standardize query keys, invalidation rules, retry behavior, and stale-time policy across modules.
- [x] Introduce shared query-client defaults for stale time, retry, mutation retry, and window-focus refetch policy.
- [ ] Add consistent error, loading, refetch, and empty-state handling across storefront, account, admin, and POS screens.

### 2.2 API client and type discipline

- [x] Complete module-specific frontend API clients for every backend module in active use.
- [x] Stop importing broad store-shaped types where module DTOs should be used.
- [ ] Normalize frontend mutation helpers for create, update, delete, status-change, refund, and sync actions.
- [x] Add a consistent API error normalization layer for field errors, auth expiry, rate limits, and server failures.
- [x] Ensure the UI never depends on legacy aggregate payloads such as bootstrap-style joins for normal operation.
- [x] Remove or deprecate leftover store modules that still model server-backed admin, account, order, or catalog state.

### 2.3 Auth and protected-route stability

- [x] Make auth resolution fully stable under login, logout, reload, expiry, and revoked-session scenarios.
- [x] Ensure protected admin/account/POS routes wait for resolved auth state before redirecting.
- [x] Reset or invalidate all relevant client caches after auth changes and profile-changing actions.
- [x] Ensure expired sessions clear stale protected UI cleanly and predictably.
- [x] Add repeatable verification for protected-route behavior during navigation and reloads.

## 3. Catalog, Storefront, and Ecommerce Completeness

### 3.1 Catalog quality

- [ ] Verify category, brand, product, variant, image, barcode, and QR workflows are complete and internally consistent.
- [ ] Ensure simple-product and variant-product pricing/stock rules behave consistently across storefront, admin, and POS.
- [x] Add robust server-side filtering, search, and sorting contracts for the storefront catalog.
- [x] Ensure sale-price and effective-price logic is consistent everywhere it is displayed or filtered.
- [x] Add durable import validation and error reporting for product/catalog spreadsheet imports.

### 3.2 Checkout and order lifecycle

- [x] Fully verify guest checkout for COD.
- [x] Fully verify account checkout for COD.
- [x] Fully verify wallet-proof checkout and proof review/rejection workflows.
- [x] Ensure shipping-zone fee calculation is authoritative and traceable on saved orders.
- [x] Ensure printable invoice views are stable, accurate, and re-runnable for past orders.
- [x] Verify account order history, order detail, and return-request flows end to end.
- [x] Ensure track-order behavior is stable, secure, and independently queryable.

## 4. POS, Billing, Receipts, and In-Store Workflows

### 4.1 POS sale lifecycle

- [x] Keep POS sales fully separate from ecommerce orders in storage, API contracts, UI terminology, and reporting.
- [ ] Ensure POS draft, finalize, reprint, and refund flows are all complete and consistent.
- [ ] Ensure barcode scan, QR scan, and manual search fallback are all reliable.
- [ ] Verify payment-method handling is correct for cash and all allowed digital methods at launch.
- [ ] Ensure receipt numbering is stable, unique, and resilient across restarts and sync.

### 4.2 Receipt and invoice output

- [ ] Finalize a thermal receipt layout that is readable, compact, and consistent for real counter printing.
- [ ] Finalize an A4 invoice layout suitable for recordkeeping and reprint.
- [ ] Ensure both receipt and invoice outputs reflect discounts, refunds, commissions, and totals correctly if applicable.
- [ ] Add repeatable verification for receipt reprint and historical invoice access.

### 4.3 Walk-in returns and refunds

- [x] Ensure receipt-linked walk-in refunds are complete and easy to operate.
- [x] Ensure stock is restored correctly on POS refunds.
- [x] Ensure financial totals and revenue reporting reflect refunded POS sales correctly.
- [x] Ensure refund reasons and audit details are preserved for reporting and support.

## 5. Inventory and Ledger Integrity

### 5.1 Stock mutation correctness

- [x] Centralize every stock-changing workflow behind one authoritative inventory mutation path.
- [x] Ensure online order decrements always create inventory movement rows.
- [x] Ensure POS sale decrements always create inventory movement rows.
- [x] Ensure returns, refunds, cancellations, and manual adjustments always create inventory movement rows.
- [x] Standardize movement reasons, source references, and audit metadata across every stock mutation source.

### 5.2 Reconciliation and reporting

- [x] Add a clean distinction between stock snapshot reads and inventory ledger/history reads.
- [ ] Ensure inventory history is understandable to a shop operator, not only technically correct.
- [ ] Add reconciliation views for current stock versus recent movement history.
- [x] Ensure out-of-stock protection is enforced consistently online and in POS.
- [ ] Add verification for variant-level stock correctness under mixed online and POS activity.

## 6. Commission System Maturity

### 6.1 Commission lifecycle

- [x] Ensure commission entries are created only through finalized POS sale workflows.
- [x] Ensure commission reversals are created only through refund workflows.
- [ ] Verify commission amount calculations are correct for product-level and variant-level rules.
- [x] Add payout lifecycle handling that clearly separates earned, reversed, and paid states.
- [ ] Prevent manual UI actions from creating commission states that bypass domain rules.

### 6.2 Commission reporting

- [ ] Add employee commission summaries by day, range, product, and sale source.
- [ ] Reconcile gross earned, reversed, paid, and payable totals clearly.
- [ ] Ensure refunded quantities and amounts reverse commission proportionally and correctly.
- [x] Add export-ready commission reporting for owner use.

## 7. Offline Sync Hardening

### 7.1 Idempotent sync protocol

- [ ] Use stable device-origin identifiers for every uploaded POS-origin record set.
- [ ] Ensure duplicate sync payloads cannot create duplicate sales, receipts, movements, payments, or commission entries.
- [x] Persist durable sync checkpoints or cursors per register device.
- [ ] Harden inbound bootstrap/projection behavior so the local runtime never becomes a second source of truth.
- [x] Add safe retry semantics for transient sync failures.

### 7.2 Operator recovery and diagnostics

- [x] Show last sync time, backlog size, retry count, and failure state clearly in POS and admin diagnostics.
- [x] Add explicit recovery actions for failed or stuck sync jobs.
- [x] Document operator steps for shop-device recovery, queue repair, and machine replacement.
- [ ] Verify cloud reporting converges correctly after extended offline billing and later replay.

## 8. Admin Surface and Reporting Quality

### 8.1 Production-only admin surface

- [x] Remove or hard-disable any remaining deferred modules that still look partially live.
- [x] Keep admin navigation limited to actually supported production modules.
- [x] Ensure direct access to deferred routes resolves to explicit unavailable states, not misleading placeholder screens.
- [x] Periodically verify generated routing output so hidden modules do not leak back into navigation.

### 8.2 Reporting maturity

- [x] Separate online revenue and POS revenue clearly on dashboard and reporting screens.
- [x] Add reliable customer metrics that do not depend on client-side joins.
- [x] Add reliable order, POS sale, refund, and commission summary metrics for date ranges.
- [x] Ensure admin reporting is cloud-authoritative and excludes unsynced local-only POS data.
- [x] Add export behavior for the key operational reports the owner will actually use.

## 9. Uploads, Files, and Media Safety

### 9.1 Upload policy

- [x] Finalize deterministic naming and storage conventions for product images and payment proofs.
- [x] Add cleanup rules for replaced, deleted, or orphaned files.
- [x] Add missing-file detection and repair guidance for broken references.
- [x] Ensure validation rules are consistent across every upload entry point.
- [x] Verify upload limits and file-type restrictions match Hostinger runtime assumptions.

### 9.2 Media operations

- [ ] Ensure image upload, preview, replacement, and deletion workflows are complete.
- [ ] Verify payment-proof uploads, reviews, rejections, and retained history behave correctly.
- [x] Document upload backup and restore procedures alongside DB backup procedures.

## 10. Security, Validation, and Runtime Safety

### 10.1 Security posture

- [ ] Review all auth, account, admin, upload, checkout, and sync endpoints for missing authorization gaps.
- [x] Tighten rate limits by endpoint class without hurting normal usage.
- [x] Ensure password, cookie, and session settings are production-safe for Hostinger deployment.
- [x] Add CSRF review and mitigation confirmation appropriate to the chosen cookie/session model.
- [x] Verify sensitive actions are logged with enough audit context.

### 10.2 Validation and error handling

- [x] Ensure every inbound API payload is validated at the route edge.
- [x] Ensure every critical business invariant is validated inside services, not assumed from input shape.
- [x] Standardize user-facing error messages for validation, auth, inventory, sync, and upload failures.
- [x] Expand structured request/error logging where operational observability is still thin.
- [x] Ensure health, readiness, and liveness endpoints reflect real dependency health rather than only process uptime.

## 11. Performance and Scalability Within Hostinger Limits

### 11.1 Query and API efficiency

- [ ] Audit N+1 and over-fetching risks in admin dashboards, catalog queries, customer metrics, and reporting endpoints.
- [x] Add pagination defaults and sensible limits for every potentially large admin list.
- [ ] Optimize heavy reporting queries so the owner can use them on shared hosting without timeouts.
- [ ] Review expensive aggregate endpoints and cache only where safe within current hosting constraints.

### 11.2 Frontend performance

- [ ] Reduce unnecessary refetches, duplicate queries, and heavy bootstrap payloads.
- [ ] Improve perceived performance for storefront catalog, product detail, admin tables, and POS search.
- [ ] Verify the app remains usable on lower-end shop hardware and typical mobile storefront devices.

## 12. Testing, Verification, and Release Confidence

### 12.1 Backend verification

- [ ] Add service-level tests for every remaining transaction-heavy workflow.
- [x] Add integration coverage for upload validation failures and recovery paths.
- [x] Add integration coverage for session expiry, revoked sessions, and protected-route auth stability.
- [x] Add integration coverage for reporting correctness around refunds, commissions, and inventory reconciliation.

### 12.2 Browser verification

- [x] Expand live-safe browser smoke to cover storefront, checkout, admin dashboard, catalog, customers, inventory, POS sales, commissions, and refunds.
- [ ] Add repeatable browser verification for receipt reprint and invoice rendering.
- [ ] Add repeatable browser verification for wallet-proof upload and review if local fixtures are available.
- [ ] Add browser verification that proves normal usage does not trip rate limiting.

### 12.3 Offline/POS verification

- [ ] Add repeatable verification for offline POS billing followed by later sync convergence.
- [ ] Add repeatable verification for duplicate sync retries without duplicate cloud records.
- [ ] Add repeatable verification for POS refund and commission reversal behavior after sync.
- [ ] Add repeatable verification for shop-device bootstrap from cloud state.

## 13. Dev Experience, Operations, and Documentation

### 13.1 Local development quality

- [x] Keep local MariaDB bootstrap fully self-bootstrapping and documented.
- [x] Ensure local startup, seed, and test commands remain durable after refactors.
- [x] Keep the repo runnable by one documented happy path for future work.
- [x] Add guardrails that fail clearly when required env vars or services are missing.

### 13.2 Production operations

- [x] Finalize Hostinger deployment runbook for env vars, migrations, seed behavior, uploads, and rollback.
- [x] Finalize backup and recovery procedures for DB and uploaded media.
- [x] Document product import/export and re-import recovery procedures.
- [x] Document shop-device replacement/bootstrap procedures.
- [x] Document release verification steps for staging and production cutover.

### 13.3 Documentation discipline

- [x] Keep `ARCHITECTURE.md` aligned with the real runtime and ownership model.
- [x] Keep `API_CONTRACTS.md` aligned with actual request/response shapes.
- [x] Keep `OPERATIONS.md` aligned with startup, backup, recovery, sync, and upload procedures.
- [x] Keep `RELEASE_CHECKLIST.md` aligned with the actual launch and verification path.
- [x] Keep `REFACTOR_PROGRESS.md` updated whenever compatibility layers are removed or major refactors land.
- [x] Keep this file updated and split large checklist items into smaller deliverables as work lands.

## 14. Product Polish and 10/10 Finish Criteria

### 14.1 UX polish

- [ ] Standardize terminology across storefront, admin, POS, reports, and docs:
  - ecommerce "orders"
  - in-store "POS sales"
  - stock "inventory movements"
  - employee earnings "commission entries"
- [ ] Ensure all key screens have polished loading, empty, error, and success states.
- [ ] Ensure all critical owner workflows are understandable without internal technical knowledge.
- [ ] Remove visible rough edges that still feel like a prototype rather than a finished retail system.

### 14.2 10/10 exit criteria

Do not call the system 10/10 for current scope until all of the following are true:

- [ ] No first-class production screen depends on demo state, placeholder modules, or legacy bootstrap joins.
- [ ] No major route file still owns cross-domain business transactions directly.
- [ ] All stock-changing workflows use one audited inventory ledger path.
- [ ] POS finalization, refunds, commission creation, and commission reversal are authoritative and repeatably tested.
- [ ] Offline sync is idempotent, diagnosable, and operationally recoverable.
- [ ] Auth and session behavior is stable under login, logout, reload, expiry, and protected-route navigation.
- [ ] Admin reporting is cloud-authoritative, internally consistent, and easy to reconcile.
- [ ] Upload handling, startup health, and runtime error behavior are predictable and documented.
- [ ] Local development, smoke verification, and regression verification are self-bootstrapping and repeatable.
- [ ] The codebase structure makes future features easier to add without reopening the same architectural debt.
