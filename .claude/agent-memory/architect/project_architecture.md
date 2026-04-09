---
name: Qimela Codebase Architecture Snapshot
description: Key structural facts about the Qimela monorepo — module boundaries, layering style, Prisma schema entities, and current auth placeholder state
type: project
---

The Qimela repo is a pnpm monorepo with two apps: `apps/api` (Nest.js, port 3000) and `apps/web` (Next.js, port 3001).

**Backend module structure** follows a strict four-layer hexagonal pattern per module:
- `presentation/` — controllers, DTOs, decorators
- `application/` — use-cases, application DTOs, mappers
- `domain/` — entities, repository interfaces, enums
- `infrastructure/` — Prisma persistence, infrastructure module binding

AppModule currently imports: `PrismaModule`, `QimelaModule`. No auth module exists yet.

**Prisma schema entities (as of 2026-04-06):**
- `User` — id (uuid), email (unique), name, createdAt, updatedAt. Relations: qimelas (creator), subscriptions. No `role`, `password`, or `passwordHash` field yet.
- `Qimela` — id, name, description, sport, status (QimelaStatus enum), creatorId (FK to User)
- `Subscription` — userId + qimelaId (unique composite), join table for user-qimela membership
- `QimelaStatus` enum: ACTIVE, COMPLETED, UPCOMING, CANCELLED, PAUSED

**Auth state:** No auth is implemented. `CurrentUser` decorator in `qimela/presentation/decorators/current-user.decorator.ts` is a hardcoded mock returning a fixed UUID. `CurrentUserPayload` interface only has `{ id: string }`.

**Frontend stack:** Next.js 15, React 19, TanStack Query v5 for data fetching. No auth library installed. `useQimelas` hook calls `/qimelas` with no auth headers. `providers.tsx` wraps with `QueryClientProvider` and `QimelaProvider`.

**Packages NOT yet installed (relevant to auth):**
- Backend: no `@nestjs/jwt`, `@nestjs/passport`, `passport`, `bcrypt`, or `cookie-parser`
- Frontend: no `next-auth`, `jose`, or any session/token library

**Why:** Authentication is the next major feature to design and implement.
**How to apply:** Any auth design must account for Prisma schema migration needs (adding `role`, `passwordHash` to User), new `AuthModule` following the established hexagonal pattern, and `CurrentUser` decorator replacement with a real JWT guard.
