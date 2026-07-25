# Bilal RMS Architecture

## Summary

Bilal RMS is a single-repo retail system built for:

- public storefront
- owner-admin web panel
- browser-based POS terminal
- Hostinger-hosted cloud API and MariaDB
- one Windows shop device with offline POS cache and sync support

The production hosting model stays intentionally simple:

- one Node.js process
- one Express app
- one MariaDB/MySQL database
- one built React frontend served by Express

## Runtime Boundaries

### Frontend

- React + TanStack Router powers storefront, admin, account, and POS UI.
- TanStack Query owns server-backed state.
- Zustand is reserved for true client-local state:
  - auth session snapshot
  - cart
  - local POS draft/cache helpers

### Backend

The backend follows a layered structure:

- `routes`
  - HTTP registration only
  - parse/validate request payloads
  - delegate to controllers
- `controllers`
  - request/response mapping
  - translate service results into API envelopes
- `services`
  - business workflows
  - transaction ownership
  - domain invariants
- `repositories`
  - Prisma access
  - query composition and persistence helpers
- `serializers`
  - DTO mapping from domain records to API shapes

Cross-cutting runtime policies:

- paginated admin list endpoints return stable `meta` objects with `page`, `pageSize`, `total`, and `pages`
- storefront catalog endpoints expose module-owned filter/search/sort contracts and return `meta.total` plus `meta.maxEffectivePrice`
- state-changing API requests require the app header `X-Requested-With: XMLHttpRequest`
- managed upload replacement deletes old local product-image files when they are no longer referenced
- upload diagnostics scan managed product-image and payment-proof paths for missing-file references
- operational CSV exports are generated from cloud-authoritative module endpoints

## Domain Boundaries

### Catalog

Owns:

- categories
- brands
- products
- variants
- product images
- barcode and QR metadata

Cloud source of truth:

- MariaDB product and catalog tables

### Orders

Owns ecommerce lifecycle only:

- online checkout
- payment proof
- shipping fee application
- order status
- customer return requests

Important rule:

- online orders are not POS sales and must stay separate in storage and workflow semantics

### POS

Owns in-store billing only:

- POS sale creation
- POS refunds
- receipts and invoice numbering
- receipt reprint tracking
- failed sync-job recovery actions
- employee attribution per line
- local queue upload/sync

Important rule:

- admin POS reporting shows synced cloud records only
- unsynced offline bills remain terminal-local until sync succeeds

### Inventory

Owns stock mutation and stock audit behavior:

- manual stock adjustments
- online order decrements
- POS sale decrements
- refund and return increments
- inventory movement ledger

Important rule:

- every stock mutation must create an inventory movement

### Commissions

Owns employee earnings for POS only:

- commission calculation on finalized POS lines
- reversal on refund
- paid status tracking

Important rule:

- commissions are derived through POS and refund workflows, not manually synthesized elsewhere

### Sync

Owns local POS device coordination:

- register bootstrap
- outbound queued jobs
- duplicate rejection
- device status tracking
- failed-job retry and operator resolution actions

Important rule:

- Hostinger MariaDB is the reporting authority after sync convergence
- the local POS cache is operational, not authoritative

## Data Ownership Rules

- Hostinger MariaDB is the cloud system of record.
- Local browser/POS cache is allowed only for offline operation and replay.
- Inventory movement is the audit trail for all stock-changing actions.
- POS sales and online orders stay in separate lifecycles and tables.
- Deferred admin modules must not appear as supported production capabilities.

## Public API Families

All APIs live under `/api/v1`.

Primary families:

- `/auth`
- `/account`
- `/catalog`
- `/orders`
- `/admin`
- `/sync`
- `/health`

Admin module-first endpoints are preferred over giant bootstrap payloads.

Admin-heavy list endpoints are paginated by default and support search-oriented query params instead of giant bootstrap payload joins.

## DTO Ownership Rules

- Request validation belongs to Zod schemas at the route edge.
- Business invariants belong to services.
- Response DTO mapping belongs to serializers.
- Frontend API clients should consume module DTOs, not infer backend shapes from shared UI store types.

## Operational Model

- Express serves API routes and built frontend assets.
- Uploads are exposed through `/uploads/*`.
- Product-image replacement cleans up managed local upload files that are no longer referenced.
- Upload diagnostics report broken managed file references for repair before launch or after restore.
- CSV export endpoints provide owner-facing operational extracts without exposing local-only POS queue state.
- Printable ecommerce invoices are first-party frontend routes backed by the order detail API.
- Startup sequence is:
  - env load and validation
  - runtime directory creation
  - DB connect
  - seed/bootstrap check
  - server listen

## Current Intentional Constraints

- single public Node app
- single managed MySQL/MariaDB
- no external queue or cache service
- owner-admin launch model
- one shop POS device at launch
