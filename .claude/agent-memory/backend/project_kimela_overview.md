---
name: Qimela project overview
description: Core architecture decisions, stack details, and key patterns established in the Qimela backend
type: project
---

Sports pool management system (qimela = sports pool).

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
The api `.env` has `DATABASE_URL=postgresql://qimela:qimela_secret@postgres:5432/qimela_db?schema=public` (Docker hostname).
For local migration runs, override: `DATABASE_URL="postgresql://qimela:qimela_secret@localhost:5432/qimela_db?schema=public" ./node_modules/.bin/prisma migrate dev`.

**Architecture pattern (DDD):**
- `domain/` — entities, enums, abstract repository interfaces, errors
- `application/` — use cases, DTOs, mappers
- `infrastructure/` — Prisma repository implementations, persistence mappers
- `presentation/` — controllers, request DTOs, decorators

**Auth (KIM-8 — COMPLETE):** JWT RS256 with httpOnly cookies + refresh token rotation + email verification + password reset.
- `apps/api/src/modules/users/` — UserEntity, UserRepository, UsersModule
- `apps/api/src/modules/auth/` — full auth module: register/login/refresh/logout/me/confirm-email/resend-verification/forgot-password/reset-password endpoints
- `@CurrentUser()` decorator returns `{ id, email, role, emailVerifiedAt }` — JWT payload has `emailVerifiedAt: null`, `/auth/me` fetches fresh from DB
- `@Public()` decorator marks routes that bypass JWT guard
- Global guards: JwtAuthGuard, RolesGuard, ThrottlerGuard (all in AppModule via APP_GUARD)
- JWT keys in `apps/api/.env` as `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` (RS256)
- Refresh tokens stored as SHA-256 hashes in `refresh_tokens` table
- Email verification tokens in `email_verification_tokens` table (24h expiry, SHA-256 hashed)
- Password reset tokens in `password_reset_tokens` table (1h expiry, SHA-256 hashed)
- Email sending via Resend (`RESEND_API_KEY` in `.env`, templates use React Email tsx)
- In non-production, all emails redirect to `froylan.vargas.gomez@gmail.com`
- `UserEntity` has `emailVerifiedAt: Date | null` field
- `tsx` email templates compiled by adding `"jsx": "react"` to `apps/api/tsconfig.json` and `@types/react` as devDependency
- `revokeAllByUserId` added to `RefreshTokenRepository` — used by `ResetPasswordUseCase` to force re-login after password reset

**QimelaStatus enum:** ACTIVE, COMPLETED, UPCOMING, CANCELLED, PAUSED.

**Entities use explicit property assignment** in constructors (not `Object.assign`) because `strict: true` is set in tsconfig.

**DTOs use `!` definite assignment assertions** on properties decorated with class-validator decorators.

**Integration tests** (`prisma-qimela.repository.spec.ts`) require DB at `postgres:5432` (Docker hostname) — they fail on the host machine without Docker network. This is expected behavior.

**How to apply:** Follow the same DDD folder structure and layering for any new module. Always use `PrismaPg` adapter when constructing PrismaClient.
