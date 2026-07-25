# Bilal RMS API Contracts

## Summary

This document defines the intended public API families and ownership rules for future work. Paths remain under `/api/v1`.

## Contract Rules

- Keep route paths stable unless a feature is explicitly removed from scope.
- Validate request shapes with Zod at the route edge.
- Keep serializers responsible for response DTO shapes.
- Prefer module-first endpoints over multi-domain bootstrap payloads.
- Do not expose local POS cache state as cloud reporting truth.
- Require `X-Requested-With: XMLHttpRequest` on state-changing API requests from the first-party web app.

List contract convention for admin-heavy endpoints:

- request query params:
  - `page`
  - `pageSize`
  - `query`
  - optional `sort`
  - optional `direction`
- response envelope:
  - module data array
  - `meta: { page, pageSize, total, pages }`

## API Families

### Auth

- `GET /api/v1/auth/me`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`

Response ownership:

- current user/session DTO

### Account

- `GET /api/v1/account/profile`
- `PUT /api/v1/account/profile`
- `POST /api/v1/account/password`
- `GET /api/v1/account/addresses`
- `POST /api/v1/account/addresses`
- `PUT /api/v1/account/addresses/:id`
- `DELETE /api/v1/account/addresses/:id`
- `POST /api/v1/account/addresses/:id/default`
- `GET /api/v1/account/orders`

Response ownership:

- profile DTO
- address DTO
- account order DTO

### Catalog

- `GET /api/v1/catalog/bootstrap`
- `GET /api/v1/catalog/products`
- `GET /api/v1/catalog/products/:slug`
- `GET /api/v1/catalog/categories`
- `GET /api/v1/catalog/brands`
- `GET /api/v1/catalog/settings`
- `GET /api/v1/catalog/shipping-zones`

Response ownership:

- storefront settings DTO
- category DTO
- brand DTO
- product DTO

`GET /api/v1/catalog/products` supports:

- `category`
- `brand`
- `search`
- `featured`
- `trending`
- `sort`
- `minPrice`
- `maxPrice`
- `size`
- `color`
- `inStock`

Catalog list response includes:

- `products`
- `meta: { total, maxEffectivePrice }`

### Orders

- `POST /api/v1/orders/checkout`
- `GET /api/v1/orders/:orderNumber`
- `POST /api/v1/orders/track`
- `POST /api/v1/orders/:orderNumber/returns`
- `GET /invoice/:orderNumber`

Response ownership:

- ecommerce order DTO
- return request DTO

Invoice route rule:

- `GET /invoice/:orderNumber` is a first-party printable invoice view backed by `GET /api/v1/orders/:orderNumber`
- guest access is token-aware through `?token=...`

### Admin

Supported production modules:

- dashboard
- products
- categories
- brands
- inventory
- online orders
- POS sales
- returns/refunds
- customers
- employees
- commissions
- settings
- imports

Representative endpoints:

- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/products`
- `GET /api/v1/admin/categories`
- `GET /api/v1/admin/brands`
- `GET /api/v1/admin/orders`
- `GET /api/v1/admin/orders/export`
- `PATCH /api/v1/admin/orders/:orderNumber/status`
- `GET /api/v1/admin/customers`
- `GET /api/v1/admin/customers/export`
- `GET /api/v1/admin/reports/summary`
- `GET /api/v1/admin/pos-sales`
- `GET /api/v1/admin/pos-sales/export`
- `POST /api/v1/admin/pos-sales/:saleNumber/reprint`
- `GET /api/v1/admin/commissions`
- `GET /api/v1/admin/commissions/export`
- `GET /api/v1/admin/inventory/ledger`
- `GET /api/v1/admin/inventory/ledger/export`
- `GET /api/v1/admin/uploads/diagnostics`
- `POST /api/v1/admin/sync-jobs/:id/retry`
- `POST /api/v1/admin/sync-jobs/:id/resolve`
- `GET /api/v1/admin/settings`

Export contract:

- export endpoints return `text/csv`
- export data is cloud-authoritative
- unsynced local POS queue items are not exported from admin reporting endpoints

Reporting contract:

- `GET /api/v1/admin/reports/summary` accepts optional `from` and `to`
- response includes cloud-authoritative overview, commission totals, employee rollups, and product rollups for the selected range

Upload diagnostics contract:

- `GET /api/v1/admin/uploads/diagnostics` returns referenced product-image and payment-proof counts
- response includes missing managed file paths for operator repair

### Sync

- `POST /api/v1/sync/register`
- `GET /api/v1/sync/bootstrap`
- `POST /api/v1/sync/push`
- `POST /api/v1/admin/sync-jobs/:id/retry`
- `POST /api/v1/admin/sync-jobs/:id/resolve`

Important rule:

- cloud endpoints expose synced state and device sync metadata, not unsynced POS-terminal drafts as business truth
- admin sync recovery actions operate on failed cloud-side sync jobs and do not expose local POS draft carts as reporting truth

### Health

- `GET /api/v1/health`
- `GET /api/v1/health/live`
- `GET /api/v1/health/ready`

## DTO Direction

- Backend serializers define response DTOs.
- Frontend API modules consume those DTOs directly.
- UI-specific store types must not become the API contract source of truth.
