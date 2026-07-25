# Bilal RMS Refactor Progress Log

This log records the major architectural shifts already landed, plus temporary compatibility layers that still exist and should eventually be removed.

## 2026-07-05 to 2026-07-10

- Moved the production data model from SQLite-era assumptions to MariaDB/Prisma-first runtime behavior.
- Added Hostinger-aligned MySQL/MariaDB migrations and seed bootstrap.
- Introduced POS, commissions, receipts, sync jobs, register devices, and related inventory extensions.
- Replaced the old global rate limiter with route-scoped limiters.
- Added Docker-based MariaDB local development workflow and repeatable local bootstrap commands.

## 2026-07-10 to 2026-07-11

- Split major backend workflows into controller/service/repository layers for orders, account, customers, dashboard, POS, inventory, commissions, settings, and sync.
- Migrated key admin and account screens from bootstrap/Zustand-heavy data loading to TanStack Query.
- Added live-safe and destructive browser smoke coverage for storefront, admin, POS, and commission/reporting flows.
- Added health endpoints and deployment/operations documentation.

## 2026-07-12

- Added explicit client-side session-expiry recovery and backend cookie clearing for revoked/expired sessions.
- Added admin mutation audit logging for inventory, orders, POS, commissions, returns, settings, shipping zones, products, brands, categories, and employees.
- Added Prisma-aware DB error mapping in the Express error handler.
- Added backend service smoke coverage for checkout, POS finalization, refunds, inventory adjustment, and sync duplicate rejection.
- Added backend MariaDB-backed HTTP integration coverage for auth, account, orders, customer metrics, and admin contracts.
- Added startup readiness checks for DB connectivity, migration presence, upload directory readiness, and post-seed verification.
- Extracted admin catalog write workflows into controller, service, repository, and shared schema ownership for product CRUD, category and brand management, barcode generation, and catalog import.
- Added integration-smoke coverage for admin catalog mutation flows and tightened category deletion to respect all existing product references, not just active ones.
- Extracted admin employee and return-management endpoints out of direct route ownership into dedicated controllers, services, repositories, and schemas.
- Added integration coverage for customer-created returns, admin employee CRUD, admin return listing and approval, and the resulting stock and order-status reconciliation.
- Fixed a real transaction-boundary bug in return approval by ensuring order-status updates participate in the same Prisma transaction instead of leaking through the global client.
- Moved settings updates, shipping-zone mutation flows, sync bootstrap reads, sync job persistence, and device sync-state updates behind repository-owned operations.
- Extended integration coverage for admin settings updates, shipping-zone CRUD, sync bootstrap payloads, and duplicate sync-job rejection.
- Extracted the legacy `/api/v1/admin/bootstrap` compatibility endpoint into dedicated controller and service ownership, keeping the path only for compatibility and exploratory tooling.
- Tightened the route-architecture guard so `admin.routes.ts` is no longer allowlisted for direct data access; only `health.routes.ts` remains exempt.
- Extended backend integration smoke to verify admin order-status mutation, inventory adjustment, POS sale creation, POS refund handling, commission status updates, and the resulting reporting and ledger effects.
- Moved admin dashboard and customer aggregation reads behind dedicated repositories, removing the last raw Prisma reads from those services.
- Split frontend account and catalog DTO types into dedicated `src/lib/account-types.ts` and `src/lib/catalog-types.ts` modules so API clients no longer depend on store files as their contract source.
- Removed the unused demo-era `src/store/retail.ts` and `src/store/settings.ts` stores, leaving Zustand usage limited to the live auth snapshot and cart state.
- Split the oversized admin router into bounded module route files for core, catalog, people, orders, inventory, POS, commissions, settings, and sync, leaving `admin.routes.ts` as a thin composition layer with shared admin middleware only.
- Fixed the route-architecture guard to scan nested route modules recursively, so the new admin sub-routers are covered by the same no-Prisma/no-transaction checks as top-level route files.
- Removed the remaining UI and API type imports from `src/store/catalog` and `src/store/auth` where dedicated DTO modules now exist, leaving store files as runtime state owners rather than shared contract sources.
- Removed the last frontend dependency on the `adminApi` compatibility barrel and confirmed no production UI code references `/api/v1/admin/bootstrap`; the legacy endpoint now remains backend-only for compatibility and exploratory tooling.
- Centralized frontend request-error handling through `RequestError`, field-error parsing, auth-expiry signaling, and `getErrorMessage(...)`, then removed the remaining route-level ad hoc `instanceof Error ? error.message` fallbacks from active screens.
- Added shared TanStack Query defaults in `src/lib/query-client.ts` for stale time, GC, retry suppression on auth/validation/rate-limit failures, mutation retry policy, and default no-focus refetch behavior, while preserving explicit screen-level overrides where live freshness matters.
- Verified the deferred admin surface with `npm run check:deferred-routes`, confirming every out-of-scope admin route resolves to the shared `NotInScope` state and none of those routes leak back into the production admin navigation.
- Converted the POS terminal to authoritative React Query reads with dedicated POS query keys and local-cache fallback, removing the last major screen-level server-data hydration path from component-local state.
- Centralized protected-route gating in `useProtectedUser(...)` for admin, POS, account, and addresses so redirects happen only after resolved auth state, and expanded auth-session teardown to clear protected account/admin/POS query caches on logout or expiry.
- Added route-wide first-party state-change protection via `X-Requested-With: XMLHttpRequest`, then updated backend integration and browser regression helpers to verify the protected contract instead of bypassing it.
- Standardized admin-heavy list contracts around paginated `meta` responses and search-aware query params for orders, customers, POS sales, commissions, and inventory ledger views.
- Added owner-facing CSV export endpoints and UI actions for online orders, customers, POS sales, commissions, and inventory ledger data.
- Added receipt reprint tracking for POS sales and wired the admin POS print action to persist reprint counts and last-printed timestamps.
- Added managed upload cleanup for replaced product images so stale local product-image files do not accumulate after product edits.
- Extended integration coverage for guest COD checkout, wallet-proof upload, session expiry, CSRF enforcement, receipt reprint tracking, and CSV export endpoints.
- Revalidated the architecture guard, backend smoke suites, destructive Playwright smoke/regression suites, and live-safe browser smoke after the paginated admin/reporting refactor.
- Added server-filtered storefront catalog contracts for category, brand, search, featured/trending, size/color, stock, sorting, and effective-price range filtering.
- Standardized effective-price calculation helpers across storefront cards, search/category/shop listing behavior, PDP display, and POS pricing reads.
- Added cloud-authoritative date-range reporting for online revenue, POS revenue, refunds, and commission rollups by employee and product.
- Added import row-failure reporting and managed-file diagnostics for product images and payment proofs through the admin imports screen and `/api/v1/admin/uploads/diagnostics`.
- Added failed sync-job retry and resolve actions plus per-device backlog/retry diagnostics to the admin POS sales surface.
- Added first-party printable ecommerce invoice routes and linked them from checkout confirmation, account order history, and track-order lookup.
- Added durable POS sync checkpoints on register devices, including persisted bootstrap timestamps, cloud projection cursors, and last sync error state.
- Added device/job-key-aware sync payload handling so sync retries can be replayed safely without duplicating the same queued sync job envelope.
- Added visible POS-terminal sync diagnostics for last bootstrap, last sync attempt/success, cursor, backlog, retries, and the latest sync error.

## Current Temporary Compatibility Layers

- `/api/v1/admin/bootstrap` still exists for compatibility and exploratory tooling, but production screens should not depend on it.
- Several deferred admin routes still exist and resolve to explicit unavailable screens instead of live modules:
  - CMS
  - coupons
  - discounts
  - notifications
  - purchase orders
  - legacy reports
  - roles
  - SEO manager
  - size charts
  - suppliers
  - activity feed

## Remaining Architectural Cleanup Themes

- Standardize DTO ownership so frontend modules stop importing broad store-centric types where narrower module DTOs are more appropriate.
- Centralize all stock-changing workflows behind one authoritative inventory mutation path.
- Harden offline POS sync semantics beyond simple duplicate rejection.
- Replace remaining deferred-route residue with a smaller, cleaner product surface.
