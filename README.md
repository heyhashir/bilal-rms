# Bilal RMS

Bilal RMS is a retail management system for a single-store clothing business. It combines a public storefront, owner admin panel, in-store POS workflow, inventory tracking, customer orders, employee commission tracking, and reporting in one codebase.

## Overview

The project is structured as a single deployable Node.js application:

- `backend/` contains the Express API, Prisma models, business services, and production server
- `src/` contains the React frontend for storefront, admin, and POS screens
- `desktop/` contains local desktop-oriented assets and supporting runtime material for shop usage

Production is designed around Hostinger Business with a managed MySQL/MariaDB database. Local development is standardized on Docker-based MariaDB.

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
- Hostinger-managed MySQL/MariaDB for persistence
- Express serving the built frontend and API from one deployment target
- Uploaded media stored under the application uploads path with database-backed references

## Verification

The repository includes repeatable verification layers:

- backend service smoke tests for transactional domain logic
- backend integration smoke tests against MariaDB
- Playwright smoke coverage for storefront, admin, POS, and checkout flows

## Status

The codebase is already structured around a production-oriented retail workflow, with local development, verification, and deployment concerns aligned to the current architecture.
