# Bilal RMS — Backend

Production-grade backend foundation for **Bilal RMS**, a commercial Retail Management System for clothing stores.

> **Sprint 1 scope:** This repository currently contains only the backend architectural foundation — server setup, middleware, logging, error handling, response conventions, and database configuration. No business domains (auth, users, products, inventory, orders, billing, etc.) are implemented yet. Those will be introduced in subsequent sprints on top of this foundation.

---

## Tech Stack

| Concern            | Technology            |
|---------------------|------------------------|
| Runtime              | Node.js (LTS)          |
| Language             | TypeScript (strict)    |
| Web framework         | Express.js             |
| ORM                   | Prisma                 |
| Database              | SQLite                 |
| Validation            | Zod                    |
| Auth (installed only) | JWT (jsonwebtoken), bcrypt |
| Security               | Helmet, CORS, Express Rate Limit |
| Logging                | Winston, Morgan         |
| File uploads (installed only) | Multer          |
| Tooling                | ESLint, Prettier        |

---

## Requirements

- Node.js 18 LTS or newer
- npm 9+

---

## Installation

```bash
# 1. Clone / copy the project, then move into the backend folder
cd backend

# 2. Install dependencies
npm install

# 3. Create your local environment file
cp .env.example .env
# then edit .env and set a real JWT_SECRET

# 4. Generate the Prisma client
npm run prisma:generate

# 5. (Optional at this stage) run the first migration
# This creates prisma/database/database.db — see the DATABASE_URL note below.
npm run prisma:migrate
```

---

## Running the Project

### Development (hot reload)

```bash
npm run dev
```

### Production build

```bash
npm run build
npm run start
```

The server starts on the port defined by `PORT` in your `.env` file (default `5000`).

### Verify it's running

```bash
curl http://localhost:5000/api/v1/health
```

Expected response:

```json
{
  "success": true,
  "message": "Bilal RMS Backend Running",
  "data": {
    "version": "1.0.0"
  }
}
```

---

## Folder Structure

```
backend/
├── prisma/
│   ├── schema.prisma        # Datasource + generator only (no models yet)
│   ├── database/             # SQLite file lives here (database.db, git-ignored)
│   └── migrations/
│
├── src/
│   ├── config/
│   │   ├── env.ts           # Validated, typed environment configuration
│   │   └── prisma.ts        # Prisma client singleton
│   │
│   ├── controllers/         # (empty — populated in future sprints)
│   ├── database/            # (empty — reserved for seeders/raw queries)
│   │
│   ├── middleware/
│   │   ├── errorHandler.ts  # Global error handler
│   │   ├── notFound.ts      # 404 handler
│   │   └── requestId.ts     # Attaches a UUID to every request
│   │
│   ├── repositories/        # (empty — data access layer, future sprints)
│   ├── routes/
│   │   └── health.routes.ts # GET /api/v1/health
│   │
│   ├── services/            # (empty — business logic layer, future sprints)
│   ├── types/
│   │   ├── ApiError.ts      # Typed operational error class
│   │   └── express/         # Express type augmentation (requestId)
│   │
│   ├── uploads/              # Multer upload destination (future sprints)
│   ├── utils/
│   │   ├── logger.ts         # Winston logger (console + file transports)
│   │   ├── ApiResponse.ts    # Standard success/error response shape
│   │   └── asyncHandler.ts   # Wraps async route handlers for error propagation
│   │
│   ├── validators/           # (empty — Zod schemas, future sprints)
│   ├── app.ts                 # Express app assembly
│   └── server.ts              # Process bootstrap + graceful shutdown
│
├── tests/                     # (empty — reserved for automated tests)
├── logs/                      # Winston log output (git-ignored)
├── .env.example
├── .gitignore
├── .prettierrc
├── .eslintrc
├── package.json
├── tsconfig.json
└── README.md
```

---

## npm Scripts

| Script                     | Description                                      |
|------------------------------|---------------------------------------------------|
| `npm run dev`                 | Run the server in watch mode via `ts-node` + `nodemon` |
| `npm run build`               | Type-check and compile TypeScript to `dist/`      |
| `npm run start`                | Run the compiled JavaScript from `dist/`          |
| `npm run lint`                  | Lint the codebase with ESLint                     |
| `npm run lint:fix`              | Lint and auto-fix where possible                  |
| `npm run format`                | Format the codebase with Prettier                 |
| `npm run prisma:generate`       | Generate the Prisma client                        |
| `npm run prisma:migrate`        | Run Prisma migrations in development mode          |

---

## Environment Variables

Defined in `.env.example`:

| Variable          | Description                                   | Default            |
|--------------------|------------------------------------------------|----------------------|
| `PORT`               | Port the HTTP server listens on                 | `5000`                |
| `DATABASE_URL`        | Prisma/SQLite connection string                  | `file:./database/database.db` |
| `JWT_SECRET`           | Secret used to sign JWTs (set before enabling auth in a later sprint) | `change_me` — replace before any real use |
| `JWT_EXPIRES_IN`       | JWT expiry duration                              | `7d`                    |
| `NODE_ENV`            | `development` \| `test` \| `production`          | `development`         |

Environment variables are validated at boot via a Zod schema (`src/config/env.ts`). If a required variable is missing or malformed, the process fails fast with a descriptive error instead of starting in a broken state.

### A note on `DATABASE_URL` and where the SQLite file actually lives

Prisma resolves a relative `file:` path in `DATABASE_URL` **relative to `prisma/schema.prisma`**, not relative to your project root or your terminal's working directory — this is a well-documented Prisma behavior (and a common source of confusion/bugs when people assume otherwise). This is true both for the Prisma CLI (`generate`, `migrate`) and, as long as you don't set a custom `generator` `output` path, for Prisma Client at runtime — both resolve consistently against the schema file's directory.

So with `DATABASE_URL="file:./database/database.db"`, the actual database file is created at:

```
backend/prisma/database/database.db
```

The `prisma/database/` folder is committed (with a `.gitkeep`) so the parent directory always exists — SQLite will not create missing parent directories on its own. The `.db` file itself is git-ignored.

---

## API Conventions

### Versioning

All routes are namespaced under `/api/v1`.

### Standard Response Shape

**Success**

```json
{
  "success": true,
  "message": "Human readable message",
  "data": {}
}
```

**Failure**

```json
{
  "success": false,
  "message": "Human readable message",
  "errors": []
}
```

Both shapes are produced centrally via `src/utils/ApiResponse.ts` so every controller returns a consistent contract.

### Error Handling

- Route handlers are wrapped with `asyncHandler` so rejected promises are forwarded to Express's error pipeline instead of crashing the process or hanging the request.
- Unmatched routes fall through to the `notFound` middleware, which raises a typed `404 ApiError`.
- All errors (including Zod validation errors) are caught by the global `errorHandler`, logged with the originating `requestId`, and returned in the standard failure shape. Stack traces and internal messages are suppressed in `production`.

### Request Tracing

Every incoming request is assigned a UUID (`x-request-id` header, generated or forwarded) by the `requestId` middleware. This ID is attached to every log line produced during that request's lifecycle, making it possible to trace a single request across logs.

### Logging

Winston is configured with:

- Colorized console output in non-production environments
- `logs/combined.log` — all log levels
- `logs/error.log` — error level only
- `logs/exceptions.log` / `logs/rejections.log` — uncaught exceptions and unhandled promise rejections

---

## Development Workflow

1. Create a feature branch off `main`.
2. Add new domain code under the appropriate layer:
   - `routes/` → route definitions only
   - `controllers/` → request/response orchestration
   - `services/` → business logic
   - `repositories/` → Prisma/database access
   - `validators/` → Zod schemas for input validation
3. Keep controllers thin — validation goes through `validators/`, data access goes through `repositories/`, and business rules live in `services/`.
4. Run `npm run lint` and `npm run format` before committing.
5. Run `npm run build` to confirm the project compiles with strict TypeScript before opening a PR.
6. Add or update Prisma models in `prisma/schema.prisma` and run `npm run prisma:migrate` whenever the data model changes.
7. Write tests under `tests/` as domain logic is introduced.

---

## Notes on This Sprint

This sprint intentionally ships **no business logic, no models, and no sample/fake data.** The goal is a clean, strictly-typed, production-ready skeleton that:

- Fails fast on invalid configuration
- Has a consistent, predictable API contract from day one
- Has first-class observability (structured logs + request correlation) built in before any feature work begins
- Enforces separation of concerns (`routes` → `controllers` → `services` → `repositories`) so future sprints have an obvious place for new code

Subsequent sprints will introduce authentication, the Prisma data model, and the retail domain (products, inventory, orders, billing, etc.) on top of this foundation.

### Why there's no placeholder Prisma model

Prisma Client generates successfully from a schema containing only a `datasource` and a `generator` block — a model is not required for `prisma generate` or `prisma migrate dev` to succeed. Adding a throwaway model purely to "unblock" generation would mean shipping dead schema that has to be manually deleted in Sprint 2, so it was left out. The schema file documents this reasoning inline.

### The `requestId` type augmentation, and why it's structured this way

`src/types/express/index.d.ts` augments Express's `Request` type using:

```ts
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export {};
```

This is more than a style choice. `tsc` builds its program from the `include` glob in `tsconfig.json`, so it picks up every matching file automatically. `ts-node`, by default, builds its program only from the entrypoint's import graph — it does **not** consult `include`/`files` unless told to. Since nothing in the source ever `import`s this ambient declaration file directly, `ts-node` would silently drop it and the build would fail with `TS2339: Property 'requestId' does not exist on type 'Request'` — even though the exact same code compiles cleanly under `tsc`.

To close that gap, `tsconfig.json` sets:

```json
"ts-node": {
  "files": true
}
```

which tells `ts-node` to also honor the `include`/`files` arrays like `tsc` does. This was verified directly: without this setting, `npm run dev` throws `TS2339`; with it, both `npm run build` and `npm run dev` compile identically and cleanly.

### Health endpoint response shape

The spec's example response for `/api/v1/health` shows `version` at the top level, while the general API contract in this same spec requires all successful responses to nest their payload under `data`. To keep the API contract uniform across every endpoint (important once dozens of endpoints exist), this implementation follows the general contract: `version` is returned under `data.version`. If a literal top-level `version` field is required for a specific client, that's a one-line change in `health.routes.ts`.
