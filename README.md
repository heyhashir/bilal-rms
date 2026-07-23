# Bilal RMS

Bilal RMS is a retail management system for a single-store clothing business. It combines a public storefront, owner admin panel, in-store POS workflow, inventory tracking, customer orders, employee commission tracking, and reporting in one codebase.

## Overview

The project is structured as a single deployable Node.js application:

- `backend/` contains the Express API, Prisma models, business services, and production server
- `src/` contains the React frontend for storefront, admin, and POS screens
- `desktop/` contains local desktop-oriented assets and supporting runtime material for shop usage

Production is designed around Hostinger Business with a managed MySQL/MariaDB database. Local development is standardized on Docker-based MariaDB.

## Hostinger Production

This repository is designed to run as one Hostinger Node.js web app with one Hostinger-managed MySQL database and no separate backend host.

- Build command: `npm run build`
- Start command: `npm run start`
- Node.js version: `20.x`
- Production port: `3000`
- Frontend build output: `backend/public`
- Runtime upload path: `storage/uploads`
- Runtime import path: `storage/runtime-imports`
- Health checks: `/api/v1/health` and `/api/v1/health/ready`

Use `.env.hostinger.example` as the template for Hostinger environment variables.

Required production variables:

```env
NODE_ENV=production
PORT=3000
APP_URL=https://your-domain.example
DATABASE_URL=mysql://DB_USER:DB_PASSWORD@localhost:3306/DB_NAME
SESSION_COOKIE_NAME=bilal_rms_session
SESSION_TTL_DAYS=30
UPLOAD_DIR=storage/uploads
IMPORT_DIR=storage/runtime-imports
PUBLIC_DIR=backend/public
MAX_UPLOAD_MB=10
ADMIN_EMAIL=owner@example.com
ADMIN_PASSWORD=change-this-before-launch
```

Hostinger deployment flow:

1. Create a Node.js Web App in hPanel and select Node `20.x`.
2. Create a Hostinger MySQL database and copy the host, database name, username, and password.
3. Connect the GitHub repository and choose the production branch.
4. Keep the repository root as the app root so Hostinger can find the top-level `package.json`.
5. Set build command to `npm run build`.
6. Set start command to `npm run start`.
7. Import the variables from `.env.hostinger.example`, then replace placeholders with real values.
8. Redeploy. Startup applies Prisma migrations, bootstraps missing core seed data, verifies readiness, and then starts Express.
9. Verify `GET /api/v1/health/ready` before opening the site to users.

Important:

- Do not use FTP upload to `public_html` for production. This project is not a static site.
- Do not deploy only `backend/public`. Hostinger must run the full Node.js app from the repository root.
- GitHub auto-deploy should be configured in Hostinger hPanel itself. The GitHub Actions workflow in this repo is build verification only.

What GitHub auto-deploy means here:

- you push code to `main`
- Hostinger pulls the latest commit from GitHub
- Hostinger rebuilds the app
- Hostinger restarts the Node app
- the new version goes live on the same domain

What stays on Hostinger and is not replaced by GitHub pushes:

- MySQL database records
- uploaded product images
- uploaded product videos
- uploaded payment proofs

## Client Review From A Clean Windows PC

Docker Desktop is the only software required. Git, Node.js, npm, and a separately installed database are not required. Install Docker Desktop, start it, open PowerShell, and run this command:

```powershell
$script = "$env:TEMP\bilal-rms-review.ps1"; Invoke-WebRequest "https://raw.githubusercontent.com/heyhashir/bilal-rms/docs/professional-readme/scripts/client-review.ps1" -OutFile $script; powershell -ExecutionPolicy Bypass -File $script
```

The script downloads the review branch using a temporary Docker Git container, builds the website, starts MariaDB and the app, applies migrations, seeds sample products and POS data, creates the default owner account, waits for the health check, and opens the browser automatically. The website will be available at [http://localhost:5000](http://localhost:5000).

If the repository has already been downloaded, run this from its folder instead:

```powershell
docker compose up --build
```

Use these review credentials:

```text
Email: admin@bilalgarments.pk
Password: admin123
```

Uploaded product media and the local database are stored in Docker named volumes and survive normal container restarts. To stop the review copy, run `docker compose down` from the installed folder. To remove all review data and start fresh, run `docker compose down --volumes`. The downloaded review folder is normally created at `%USERPROFILE%\BilalRmsReview`.

## Core Capabilities

- Ecommerce storefront with catalog browsing, product detail, cart, checkout, and order tracking
- Owner admin for products, categories, brands, orders, customers, returns, refunds, employees, commissions, settings, reports, and imports
- POS billing flow for in-store sales with barcode or QR lookup, receipt generation, and stock updates
- Shared inventory ledger for online orders, POS sales, refunds, and manual adjustments
- Employee-based commission tracking for in-store sales
- Media upload support for product images, product videos, and payment proof screenshots
- Query-driven admin and account flows backed by MariaDB through `/api/v1/*`

## Tech Stack

- Frontend: React 19, Vite, TanStack Router, TanStack Query, Zustand
- Backend: Node.js 20, Express, Prisma, Zod
- Database: MariaDB / MySQL
- Testing: Playwright, backend service smoke tests, backend integration smoke tests

## Local Development

### Prerequisites

- Node.js `20.x`
- npm
- Docker Desktop

### Install

```bash
npm install
```

### Start the local database and seed the app

```bash
npm run db:up
npm run db:prepare
```

### Start the full local stack

```bash
npm run dev:full
```

This starts:

- MariaDB in Docker on `127.0.0.1:3307`
- the backend development server
- the frontend development server

### Start the production-style local runtime

```bash
npm run start:local
```

This builds and serves the frontend through the backend server so you can test the app closer to production behavior.

## Common Commands

```bash
npm run build
npm run db:up
npm run db:down
npm run db:logs
npm run db:reset
npm run seed
npm run seed:demo
npm run test:backend:services
npm run test:backend:integration
npm run test:e2e:smoke
```

## Database

Local development uses the committed Docker MariaDB runtime. Prisma migrations are MariaDB-first, and the local workflow applies migrations and seeds default store data automatically.

Default local database target:

```env
DATABASE_URL="mysql://bilal_rms:bilal_rms@127.0.0.1:3307/bilal_rms"
```

## Production Model

The intended production setup is:

- Hostinger Business for the Node.js application
- Hostinger-managed MySQL for persistence through Prisma's `mysql` datasource
- Express serving the built frontend and API from one deployment target
- Uploaded media stored under `storage/uploads` with database-backed references

The `/pos` route works inside the same hosted web app. Its offline queue uses browser storage on the billing PC, not a separate paid service.

What works fully through the website after deployment:

- storefront browsing, product pages, cart, checkout, and order tracking
- owner admin login and management of catalog, inventory, orders, customers, employees, commissions, settings, and imports
- POS billing through `/pos`
- product image and video uploads
- payment proof uploads
- all database-backed changes from the admin or storefront

## Verification

The repository includes repeatable verification layers:

- backend service smoke tests for transactional domain logic
- backend integration smoke tests against MariaDB
- Playwright smoke coverage for storefront, admin, POS, and checkout flows

## Status

The codebase is already structured around a production-oriented retail workflow, with local development, verification, and deployment concerns aligned to the current architecture.
