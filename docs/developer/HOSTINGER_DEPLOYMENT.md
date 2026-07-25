# Hostinger Deployment Notes

## Runtime
- Node.js: `20.x`
- Build command: `npm run build`
- Start command: `npm run start`
- Hostinger runtime port: `3000`
- Local shop POS launcher: `desktop/run-pos.ps1`

## Required environment variables
- `NODE_ENV=production`
- `APP_URL=https://your-domain.example`
- `PORT=3000`
- `DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DATABASE`
- `SESSION_COOKIE_NAME=bilal_rms_session`
- `SESSION_TTL_DAYS=30`
- `UPLOAD_DIR=storage/uploads`
- `IMPORT_DIR=storage/runtime-imports`
- `PUBLIC_DIR=backend/public`
- `MAX_UPLOAD_MB=10`
- `ADMIN_EMAIL=admin@bilalgarments.pk`
- `ADMIN_PASSWORD=change-this-before-launch`

Production guardrails now enforced by startup:
- `APP_URL` must be an `https://` public origin
- `APP_URL` cannot point to `localhost`
- `ADMIN_PASSWORD` cannot remain on the default value
- built frontend assets must exist in `backend/public` before the app will start

## Database
- Create a MySQL database in Hostinger hPanel.
- Update `DATABASE_URL` to the Hostinger connection string.
- The app start flow runs `prisma migrate deploy` before starting Express.
- The schema migrations checked into the repo are:
  - `backend/prisma/migrations/20260705121919_init`
  - `backend/prisma/migrations/20260706000000_mysql_init`
  - `backend/prisma/migrations/20260710000000_pos_extensions`
  - `backend/prisma/migrations/20260713080000_sync_device_checkpoints`
- Seed/bootstrap behavior:
  - `npm run seed` ensures the owner account and base store settings exist if missing
  - register devices are created lazily from the POS runtime on first bootstrap
  - the seed path is intended to be idempotent and safe to rerun

## Deployment flow
1. In hPanel, create a Node.js Web App on the Business plan and select Node `20.x`.
2. Create the Hostinger MySQL database in hPanel and copy the database name, username, password, and host.
3. Connect the GitHub repository and choose the production branch.
4. Set the root directory to the repository root where `package.json` lives.
5. Set the build command to `npm run build`.
6. Set the start command to `npm run start`.
7. Import the variables from `.env.hostinger.example`, then replace placeholder values with the real domain and database credentials.
8. Redeploy. The start flow runs `prisma migrate deploy`, then boots the app, creates missing core seed data, and serves the built frontend through Express.
9. Confirm `GET /api/v1/health/ready` returns healthy.
10. Verify storefront, admin, uploads, and POS flows on the staging domain before cutover.

## Uploads
- Product images, product videos, and payment proofs are written under `storage/uploads`.
- Catalog import spreadsheets are written under `storage/runtime-imports` and are not publicly exposed.
- Expose the uploads path through the app at `/uploads/*`.
- Verify upload persistence on Hostinger before launch. If the deployment target does not preserve this directory between restarts, swap the storage adapter before going live.
- Keep a dated off-host backup of:
  - `storage/uploads/products`
  - `storage/uploads/payments`
  - `storage/uploads/videos`

## POS and Offline
- The in-store POS lives at `/pos`.
- The Windows billing PC uses the same owner login and stores a local POS cache plus queued offline sales in the browser profile.
- Sync helper endpoints are available at `/api/v1/sync/*`.
- See `desktop/README.md` for the one-PC shop runtime flow.
- The POS runtime now persists:
  - the last bootstrap timestamp
  - the last cloud projection cursor
  - the last sync attempt/success state
  - the local queued-sale backlog count
  - the last sync error for operator diagnostics

## Rollback and recovery

If a deploy fails before migrations run:
1. fix the app code or env vars
2. redeploy the previous known-good commit

If a deploy fails after migrations run:
1. restore the latest pre-deploy SQL backup into a recovery database
2. point `DATABASE_URL` at the recovery database if an immediate rollback is required
3. redeploy the last known-good application build
4. restore uploads from backup if the failed release modified product images or payment proofs

If catalog or upload data is damaged:
1. restore the relevant SQL backup and upload directories
2. rerun the product import from the versioned import source files if needed
3. review `/admin/imports` diagnostics until no managed-file references are missing

## Staging and production cutover

Staging verification:
1. verify admin login
2. verify seeded products or import the launch catalog
3. place one COD order and one wallet-proof order
4. create one POS bill and one POS refund
5. verify POS sale, refund, inventory movement, and commission reporting in admin
6. verify uploads survive a restart/redeploy

Hostinger-specific notes:
1. Hostinger currently supports managed MySQL on this hosting tier, not PostgreSQL or MongoDB.
2. Hostinger's current Node.js guidance expects the application to listen on port `3000`.
3. Environment variable changes require a redeploy to take effect.
4. Build and runtime failures should be checked from hPanel deployment logs and runtime logs.

Production cutover:
1. take a final SQL dump and upload backup from staging or current production
2. apply the production env vars
3. deploy the approved commit
4. run migrations and seed/bootstrap
5. verify `health/ready`
6. verify storefront home, `/shop`, admin login, one test order, and one POS bootstrap
7. only then switch traffic or announce go-live

## First launch checklist
1. Set production environment variables in hPanel.
2. Connect the GitHub repository to the Node.js Web App.
3. Trigger a deploy and confirm `npm run build` completes.
4. Confirm the admin seed user can sign in.
5. Add real shipping zones, products, employees, commission rules, barcodes, and branding settings in admin.
6. Place one COD order and one wallet-proof order in staging.
7. Create one POS bill, print the receipt, then process one counter refund.
8. Confirm the Windows billing PC can reopen `/pos` and replay queued sales after reconnecting.
