---
name: qimela Codebase Architecture Snapshot
description: Key structural facts about the qimela monorepo — module boundaries, layering style, Prisma schema entities, and auth/domain state
type: project
---

The qimela repo is a pnpm monorepo with two apps: `apps/api` (Nest.js, port 3000) and `apps/web` (Next.js).

**Backend module structure** follows a strict four-layer hexagonal pattern per module:

- `presentation/` — controllers, DTOs, decorators
- `application/` — use-cases, application DTOs, mappers
- `domain/` — entities, repository interfaces, enums
- `infrastructure/` — Prisma persistence, infrastructure module binding

**Prisma schema entities (as of 2026-04-09):**

- `User` — id (uuid), email (unique), name, role (UserRole enum: USER/ADMIN), passwordHash, emailVerifiedAt, createdAt, updatedAt
- `qimela` — id, name, description, sport (String, to be deprecated), status (QimelaStatus enum), creatorId (FK to User). sport field should eventually be replaced by Event → League → Sport traversal.
- `Subscription` — userId + qimelaId composite unique join table
- `RefreshToken`, `EmailVerificationToken`, `PasswordResetToken` — auth token tables with tokenHash, expiresAt, usedAt/revokedAt
- `Sport` — id, name (unique), imgUrl
- `League` — id, name, imgUrl, sportId FK. Unique on (name, sportId). Permanent, never time-bounded.
- `Contender` — id, name, imgUrl. Participants (teams, drivers, players).
- `ContenderLeague` — composite PK (contenderId, leagueId), joinedAt. Many-to-many join.

**Domain schema design decisions (2026-04-09):**
See `docs/features/schema/entity-persistance-logic.md` for the full implementation plan including Event, Phase, Session, PickCategory, SessionResult, UserPick models. Key decisions:

- Sport-agnostic via PickCategory (named slots per sport) + EAV-style result/pick rows
- PickCategory defined at Sport level, overridable per session via SessionPickCategory
- SessionResult and UserPick each have both `contenderId` (nullable FK) and `value` (nullable String) to handle contender-slot vs scalar categories
- qimela links to Event (nullable FK) rather than raw sport string

**Frontend stack:** Next.js 15, React 19, TanStack Query v5. SCSS + CSS Modules. Vitest + React Testing Library.

**Why:** Auth is implemented (tokens, password hash, email verification exist in schema). Domain event/session/pick schema is designed but not yet migrated.
**How to apply:** When working on new features, verify schema state against actual `apps/api/prisma/schema.prisma` since design docs lead the implementation.
