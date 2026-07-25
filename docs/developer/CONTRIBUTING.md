# Contributing to Bilal RMS

## Core Rule

Do not add new business logic directly into route files.

New work should follow this ownership order:

1. route
2. controller
3. service
4. repository
5. serializer

## Where New Logic Goes

### Route

Use routes for:

- path registration
- auth middleware
- request validation handoff
- controller invocation

Do not use routes for:

- multi-step transactions
- inventory logic
- commission logic
- sync logic
- order orchestration

### Controller

Use controllers for:

- reading validated request data
- calling a service
- mapping service results into `ApiResponse`

### Service

Use services for:

- business workflows
- transaction ownership
- invariants and lifecycle rules
- cross-repository coordination

### Repository

Use repositories for:

- Prisma access
- composable query helpers
- persistence-level lookup patterns

### Serializer

Use serializers for:

- stable response DTO mapping

## Frontend State Rules

- Use TanStack Query for server-backed state.
- Use Zustand only for client-local state such as cart and local POS cache.
- Do not reintroduce giant bootstrap dependencies for normal admin CRUD screens.
- Add new API helpers under `src/lib/*-api.ts`.
- Add query keys under `src/lib/query-keys.ts`.

## Naming Rules

- Use `orders` for ecommerce only.
- Use `POS sales` for in-store billing only.
- Use `inventory movements` for the stock ledger.
- Use `commission entries` for employee earnings.

## Testing Rules

- Add or update browser verification when changing user-visible workflows.
- Prefer backend service/integration coverage for transaction-heavy logic.
- Keep smoke paths stable for login, catalog, checkout, POS, and admin reporting.

## Scope Rules

- Deferred modules must not look production-ready.
- If a module is out of scope, hide it from primary navigation and render a clearly deferred state.
