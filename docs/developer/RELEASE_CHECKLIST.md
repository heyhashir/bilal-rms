# Bilal RMS Release Verification Checklist

Use this checklist before any staging or production release.

## 1. Environment and Database

- [ ] Confirm local or target environment variables are present and valid.
- [ ] Confirm MariaDB is reachable.
- [ ] Run `npm run db:deploy`.
- [ ] Run `npm run seed`.
- [ ] Confirm startup readiness passes:
  - [ ] env validation
  - [ ] DB query succeeds
  - [ ] Prisma migrations table is present
  - [ ] upload directories are writable
  - [ ] store settings seed exists
  - [ ] owner admin seed exists
  - [ ] default register device seed exists

## 2. Build and Static Verification

- [ ] Run `npm run build`.
- [ ] Confirm frontend assets are generated under `backend/public`.
- [ ] Confirm backend TypeScript build succeeds.

## 3. Backend Regression Verification

- [ ] Run `npm run test:backend:services`.
- [ ] Run `npm run test:backend:integration`.
- [ ] Confirm service smoke covers:
  - [ ] checkout
  - [ ] POS finalization
  - [ ] POS refund
  - [ ] inventory adjustment
  - [ ] sync duplicate rejection
- [ ] Confirm integration smoke covers:
  - [ ] register/login/logout
  - [ ] CSRF/state-change header enforcement
  - [ ] account addresses
  - [ ] account orders
  - [ ] track order
  - [ ] admin dashboard
  - [ ] admin orders
  - [ ] admin customers
  - [ ] admin reports summary
  - [ ] upload diagnostics
  - [ ] receipt reprint tracking
  - [ ] CSV exports

## 4. Browser Verification

- [ ] Run `npm run test:e2e:smoke`.
- [ ] Run `npm run test:e2e:regression`.
- [ ] Run `npm run test:e2e:live` against a running local instance.
- [ ] Confirm browser smoke still covers:
  - [ ] storefront catalog rendering
  - [ ] storefront invoice rendering
  - [ ] admin login and reload behavior
  - [ ] admin catalog CRUD
  - [ ] admin inventory adjustment
  - [ ] POS billing flow
  - [ ] POS sales visibility in admin
  - [ ] commissions visibility in admin
  - [ ] POS refund workflow
  - [ ] customers visibility in admin
  - [ ] reports and import diagnostics pages
  - [ ] normal navigation without rate-limit failures

## 5. Manual High-Risk Checks

- [ ] Verify one COD checkout manually.
- [ ] Verify one POS sale manually.
- [ ] Verify one POS refund manually.
- [ ] Verify one commission update manually.
- [ ] Verify one CSV export manually.
- [ ] Verify one POS receipt reprint manually.
- [ ] Verify one product image upload manually.
- [ ] Verify one wallet-proof upload manually.
- [ ] Verify `/api/v1/health/live` and `/api/v1/health/ready`.

## 6. Staging or Production Deploy

- [ ] Deploy the current build.
- [ ] Confirm the final domain loads the storefront.
- [ ] Confirm admin login succeeds on the deployed domain.
- [ ] Confirm MariaDB connectivity is stable after deploy.
- [ ] Confirm uploaded files remain available after restart/redeploy.
- [ ] Confirm SPA fallback works for direct route loads.

## 7. Post-Deploy Audit

- [ ] Review request logs for unexpected 4xx/5xx spikes.
- [ ] Review audit logs for admin mutations during smoke verification.
- [ ] Confirm no unsupported deferred module is exposed in primary navigation.
- [ ] Record release notes and any intentional temporary compatibility layers in `REFACTOR_PROGRESS.md`.
