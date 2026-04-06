---
name: Kimela project overview
description: Core architecture decisions, stack details, and key patterns established in the Kimela backend
type: project
---

Sports pool management system (kimela = sports pool).

**Why:** System to create, manage and participate in sports pools.

**Stack:**
- NestJS + TypeScript (API, port 3000)
- Prisma v7 + PostgreSQL (uses driver adapters — `@prisma/adapter-pg`, NOT the old query engine)
- pnpm workspaces (`apps/api`, `apps/web`)

**Critical: Prisma v7 driver adapters**
PrismaClient requires an `adapter` option (not `datasourceUrl`):
```ts
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
```
`DATABASE_URL` is read from `apps/api/.env` (loaded via `dotenv` or `prisma.config.ts`).

**Architecture pattern (DDD):**
- `domain/` — entities, enums, abstract repository interfaces, errors
- `application/` — use cases, DTOs, mappers
- `infrastructure/` — Prisma repository implementations, persistence mappers
- `presentation/` — controllers, request DTOs, decorators

**Auth:** Not implemented yet. `@CurrentUser()` decorator hardcodes user id `e471c62d-6015-4ab9-b930-79db54ea75c0`.

**KimelaStatus enum:** ACTIVE, COMPLETED, UPCOMING, CANCELLED, PAUSED (CLOSED was renamed to COMPLETED in migration 20260406164311_initial).

**How to apply:** Follow the same DDD folder structure and layering for any new module. Always use `PrismaPg` adapter when constructing PrismaClient.
