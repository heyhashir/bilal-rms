# Bilal RMS Operations Runbook

## Local Development

Canonical local workflow:

```bash
npm install
npm run db:up
npm run db:prepare
npm run dev:full
```

Production-style local runtime:

```bash
npm run start:local
```

Automated smoke environment:

```bash
npm run test:e2e:smoke
```

The smoke suite starts its own isolated local stack on a dedicated port so it does not depend on any server already running on `5000`.

Live-safe browser verification against an already running local instance:

```bash
npm run start:local
npm run test:e2e:live
```

## Health Endpoints

- `GET /api/v1/health`
  - lightweight service metadata
- `GET /api/v1/health/live`
  - confirms the process is alive
- `GET /api/v1/health/ready`
  - confirms the app can currently talk to the database

Use `ready` for deployment verification and post-restart checks.

## Hostinger Deployment Notes

Production assumptions:

- Node `20.x`
- one Hostinger Node app
- one Hostinger-managed MySQL/MariaDB database
- built frontend served by Express

Required environment variables are listed in [HOSTINGER_DEPLOYMENT.md](HOSTINGER_DEPLOYMENT.md).

Deployment-safe flow:

1. configure env vars in hPanel
2. deploy from GitHub
3. run migrations
4. confirm seed/bootstrap state
5. verify `GET /api/v1/health/ready`
6. verify admin login
7. verify storefront, checkout, and POS flows

## Backup and Recovery

### MySQL / MariaDB

Recommended minimum procedure:

1. export the production database before major releases
2. keep dated SQL dumps outside the app host
3. verify that the latest dump can be restored into a non-production database

Manual recovery checklist:

1. create or reset the target database
2. import the latest SQL dump
3. restore environment variables
4. redeploy the app
5. verify `health/ready`
6. verify admin login and order/POS visibility

### Uploads

Back up:

- `backend/uploads/products`
- `backend/uploads/payments`

Recovery steps:

1. restore the directory contents
2. verify file permissions
3. verify product images and payment proofs resolve through `/uploads/*`
4. if product images were recently replaced, confirm the current DB paths still exist and remove orphaned stale files if needed

Broken reference diagnostics:

1. open `/admin/imports`
2. review product-image and payment-proof diagnostics
3. restore missing files from backup or update the affected records through admin tooling/import reruns
4. rerun diagnostics until no missing managed file paths remain

### Product Imports

Keep the launch import files versioned outside the running app so the catalog can be replayed if needed.

Recommended recovery procedure:

1. keep the approved launch CSV/XLSX files under version control or in dated release storage
2. export a fresh SQL dump before rerunning a large import in production
3. rerun the product import from `/admin/imports`
4. review row-level import failures and managed-file diagnostics
5. restore missing image files or rerun the corrected import until diagnostics are clean

Operational export guidance:

- use the owner-facing CSV exports from admin for day-to-day operational extracts
- use the versioned source import files, not ad hoc exported CSVs, as the canonical replay input for catalog rebuilds

### POS Queue Recovery

If a billing device loses sync state:

1. inspect local queued sales from the POS terminal/browser profile
2. restore network connectivity
3. replay queued sales through sync or the terminal sync action
4. verify the corresponding cloud POS sales, inventory movements, and commission entries exist

If cloud sync jobs are stuck or failed:

1. open `/admin/pos-sales`
2. review device backlog, failed-job count, and retry count in sync diagnostics
3. use `Retry` for transient failures after the root cause is corrected
4. use `Resolve` only after confirming the failed job no longer needs replay
5. verify the affected POS sale, commission, and inventory records from cloud-authoritative admin screens

### Shop Device Replacement

If the shop PC or browser profile must be replaced:

1. verify the cloud admin screens are up to date for POS sales, commissions, and inventory
2. export any still-unsynced local queue data from the old machine if it is accessible
3. sign into the new machine with the owner account
4. open `/pos` and allow the device to register and bootstrap from cloud state
5. verify products, employees, settings, and sync diagnostics populate locally
6. if unsynced local sales were recovered from the old machine, replay them once and verify they appear in `/admin/pos-sales`
7. print a test receipt and confirm numbering and inventory movement are correct

### Release Verification

Staging release verification:

1. confirm `GET /api/v1/health/ready`
2. verify admin login and protected-route reload behavior
3. verify `/shop`, product detail, cart, and COD checkout
4. verify wallet-proof upload and review if fixtures are available
5. verify product image upload and replacement
6. verify POS bill, POS refund, commission entry, and sync diagnostics
7. verify invoice print, POS receipt reprint, customers, reports, and exports

Production cutover verification:

1. repeat health, storefront, admin, POS, and upload smoke checks on the live domain
2. verify one real or staged test order and one POS bootstrap after deploy
3. verify uploads persist after the first restart/redeploy window
4. take a fresh post-launch SQL dump and upload backup once production is accepted

## Logging and Incident Checks

When investigating a production issue:

1. confirm `health/live`
2. confirm `health/ready`
3. inspect recent request logs
4. inspect rate-limit hits
5. inspect the affected admin/order/POS records directly in MariaDB
6. verify whether the issue is cloud-truth, local POS queue, or UI-only

## Reporting and Export

Owner-facing CSV exports are available from the live admin modules for:

- online orders
- customers
- POS sales
- commissions
- inventory ledger

Date-range reporting is available from `/admin/reports` for:

- online revenue
- POS revenue
- POS refunds
- commission earned, reversed, paid, and payable
- employee and product commission rollups

Operational rule:

- exports must be taken from the admin cloud views, not from any local/offline POS queue state
