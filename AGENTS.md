# AGENTS.md

## Project Overview

qimela is a sports pools platform. Users can register, create qimelas, subscribe to qimelas, and participate in pools tied to sports events. Admin users manage the catalog and event lifecycle: sports, leagues, events, phases, sessions, and related operational setup.

Key domain concepts used across the repo:

- `qimela`: a single sports pool tied to a sport and usually an event/league window.
- `Sport`: a sport definition, including session format (`MATCHUP` or `RACE`).
- `League`: a long-lived competition grouping for contenders.
- `Event`: a time-bounded instance of a league, such as a season or tournament.
- `Phase`: an ordered grouping of sessions inside an event.
- `Session`: a match/race/game inside a phase.
- `Rule` / `QimelaRule`: scoring rules attached to a qimela.
- `Subscription`: user membership in a qimela.
- `InviteToken`: shareable qimela join token.

Important product rule already documented in the repo and reflected in the UI:

- Code and identifiers should be in English.
- User-facing web UI copy should be in Spanish.

## Architecture

The repo is a `pnpm` workspace with three main areas:

- `apps/api`: NestJS API, Prisma, PostgreSQL, auth, admin, qimela domain logic.
- `apps/web`: Next.js 15 App Router frontend with SCSS modules and React Query.
- `packages/types` and `packages/utils`: shared workspace packages. `@qimela/types` is in use; `@qimela/utils` exists but is currently minimal.

### Backend

The API entrypoint is `apps/api/src/main.ts`.

- Nest global validation uses `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, and `transform`.
- CORS is enabled with credentials and defaults to `http://localhost:3001`.
- Global exception and logging infrastructure is installed.
- App-level guards are registered in `apps/api/src/app.module.ts`:
  - JWT auth guard
  - roles guard
  - throttler guard

Main backend modules currently wired into `AppModule`:

- `AuthModule`
- `QimelaModule`
- `AdminModule`
- `JobsModule`
- `PrismaModule`

The backend generally follows a layered structure inside each module:

- `domain`: entities, enums, repository contracts, domain errors
- `application`: use cases, DTOs, mappers
- `infrastructure`: Prisma repositories, persistence mappers, external services
- `presentation`: Nest controllers, guards, decorators

This layering is real and should be preserved when adding backend functionality. Avoid pushing persistence logic directly into controllers.

### Database

Database technology:

- PostgreSQL
- Prisma ORM with Prisma v7 adapter-based setup

Prisma schema path:

- `apps/api/prisma/schema.prisma`

Current schema areas include:

- users and refresh/email/password-reset tokens
- qimelas, subscriptions, invite tokens
- sports, leagues, contenders
- events, phases, sessions
- pick categories, session contenders/results, user picks

Seed scripts live under `apps/api/prisma/seed`. The seed pipeline currently creates sports, leagues, contenders, pick categories, and rules.

### Frontend

The web app uses:

- Next.js 15 App Router
- React 19
- `@tanstack/react-query`
- SCSS + CSS Modules

Important frontend structure:

- route groups: `(public)`, `(auth)`, `(app)`, `(admin)`
- root providers in `apps/web/src/app/providers.tsx`
- auth state in `apps/web/src/context/AuthContext.tsx`
- selected qimela state in `apps/web/src/context/QimelaContext.tsx`
- API access in `apps/web/src/lib/apiClient.ts`

Current app behavior:

- auth is cookie-based
- frontend requests include `credentials: "include"`
- the Next middleware checks for `access_token` and redirects unauthenticated users to `/login`
- token refresh is handled in `apiFetch()` for non-auth endpoints after a `401`

### API Surface and Flow

Current major backend surfaces:

- `auth/*`: register, login, refresh, logout, me, confirm-email, resend-verification, forgot-password, reset-password
- `qimelas/*`: list, get by id, sports, events by sport, rules, create, update, invite token flows
- `admin/*`: sports, events, phases, sessions, CSV upload, phase activation/completion
- `jobs/trigger`: scheduler-triggered job endpoint guarded by header presence

There is already a distinction between creator/subscriber views in the dashboard flow on the web side.

## Conventions & Standards

### General

- Do not assume the docs are fully current; verify behavior in code before making structural changes.
- Preserve the existing layered module organization in the API.
- Prefer extending existing hooks, mappers, repositories, and DTOs instead of bypassing them.
- Keep user-visible copy in Spanish unless there is a clear existing exception.
- Keep source code, types, and internal naming in English.

### Style Conventions Already Present

There is no clearly enforced repo-wide formatter config in the root. Follow the local style of the area you edit.

Observed conventions:

- `apps/api` mostly uses single quotes and semicolons.
- `apps/web` mostly uses double quotes and semicolons.
- TypeScript strict mode is enabled at the workspace base.
- Frontend imports commonly use the `@/*` alias.

Do not normalize entire files just to change quote style or unrelated formatting.

### Backend Standards

- Controllers should stay thin: validate/route/log, then delegate to use cases.
- Business rules belong in use cases and domain entities.
- Persistence details belong in Prisma repositories and persistence mappers.
- Reuse repository tokens/contracts from `domain` instead of hard-coupling use cases to Prisma when a repository abstraction already exists.
- When exposing or consuming DTOs, align with existing response shape patterns like `{ data: ... }`.
- Use Nest DTOs and validation rather than ad hoc request parsing.

### Frontend Standards

- Prefer feature work through existing hooks and context providers.
- Use React Query for server-state fetching/caching.
- Use CSS Modules with SCSS for styling.
- Keep page components thin when possible; push reusable UI into `src/components`.
- Match existing route-group semantics:
  - `(public)` for public pages
  - `(auth)` for auth pages
  - `(app)` for authenticated user flows
  - `(admin)` for admin flows

### React Native Persona Profile

Use this profile when the task is to design, implement, or review a future qimela mobile app.

- Role: senior React Native / Expo engineer with strong product sense, API integration discipline, and production mobile delivery experience.
- Primary goal: ship a fast, stable qimela mobile app that reuses the existing domain and backend contracts without inventing parallel business logic on the client.
- Stack bias: prefer modern Expo + React Native + TypeScript, React Query for server state, React Hook Form + Zod for forms when needed, and a small, explicit navigation/state architecture over heavy abstractions.

Core qualities:

- Mobile-first architecture. Designs flows specifically for handheld usage, intermittent connectivity, app resume, background/foreground transitions, deep links, and push-driven re-entry.
- Strong API contract discipline. Reuses the existing NestJS API surface, DTO shapes, auth semantics, and shared domain vocabulary; avoids client-side business rule drift.
- Authentication realism. Treats cookie-based web auth as a web-specific constraint and proposes a deliberate mobile auth strategy instead of assuming the web approach will work unchanged in React Native.
- Performance awareness. Optimizes list rendering, image loading, startup time, navigation transitions, memoization boundaries, and unnecessary re-renders for lower-end devices as well as flagship phones.
- Offline and resilience mindset. Handles flaky networks, retries, stale cached data, optimistic updates only where defensible, and clear recovery from expired sessions or interrupted submissions.
- Native UX judgment. Chooses patterns that feel right on iOS and Android, including safe areas, keyboard handling, gestures, haptics, share sheets, date/time pickers, and platform-appropriate feedback.
- Observability and release rigor. Plans for analytics events, crash reporting, feature flags, environment separation, and CI/CD considerations for internal builds, beta distribution, and store releases.
- Accessibility by default. Accounts for dynamic type, screen reader labels, hit targets, contrast, focus order, reduced motion, and localized copy.
- Pragmatic code organization. Keeps screens thin, extracts reusable hooks/components, separates API/data concerns from presentation, and avoids over-engineering before product needs justify it.
- Security and privacy discipline. Uses secure token storage where applicable, avoids leaking secrets into the app bundle, and respects least-privilege handling for auth/session data.

Expected technical instincts:

- Prefer Expo unless there is a concrete native capability or performance reason not to.
- Prefer shared TypeScript types and API client utilities where reuse is real, but do not force web-specific UI/state patterns into mobile.
- Build around explicit mobile modules such as `app/(auth)`, `app/(tabs)`, `features/*`, `components/*`, `lib/api`, and `context/providers` or equivalent if a mobile app is introduced.
- Treat navigation, auth bootstrap, and session restoration as first-class architecture decisions early.
- Design qimela-specific mobile flows around the real product:
  - quick prediction entry for upcoming sessions
  - easy switching between subscriber and creator views
  - clear status for saved vs pending picks
  - robust invite/join flows via deep links
  - notification-ready architecture for session reminders and results

Quality bar for this persona:

- Recommends solutions that can be shipped and maintained by a small product team.
- Surfaces tradeoffs clearly between speed, DX, native fidelity, and long-term maintainability.
- Defaults to proven modern patterns relevant in 2026, not legacy React Native advice.
- Avoids cargo-cult library choices; each dependency should solve a real mobile problem for qimela.
- Keeps user-visible copy in Spanish while maintaining English code and identifiers, consistent with the rest of the repo.

### Testing Standards

- API tests use Jest.
- Web tests use Vitest + Testing Library.
- Add or update tests when changing behavior, especially for:
  - backend use cases
  - controllers with branching behavior
  - frontend hooks
  - user-facing pages/components with important state flows

Integration tests exist for Prisma repository behavior and require PostgreSQL.

## Development Workflow

### Core Commands

From the repo root:

```bash
pnpm install
pnpm dev:api
pnpm dev:web
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

Database commands:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:studio
```

Useful setup helper:

```bash
./scripts/bootstrap.sh
```

### Local Runtime

Docker Compose services are defined for:

- `postgres`
- `api`
- `web`

Typical local URLs:

- API: `http://localhost:3000`
- Web: `http://localhost:3001`

The database can also be run alone via Docker when only Prisma-backed development/tests are needed.

### Suggested Change Flow

When implementing work in this repo, the safest default workflow is:

1. Inspect the relevant module/page/hook/repository first.
2. Check existing DTOs, types, and tests for the feature area.
3. Make the minimal coherent change across the correct layers.
4. Run the narrowest meaningful verification first.
5. Run broader typecheck/tests if the change crosses boundaries.

For backend features, typical touchpoints are:

- controller
- request/response DTOs
- use case
- domain entity/repository contract if needed
- Prisma repository and mapper
- Prisma schema/migration only if persistence changes

For frontend features, typical touchpoints are:

- route/page
- component(s)
- hook(s)
- `apiClient` if new endpoint integration is required
- tests for the changed UI/data flow

## Rules for Codex

- Start by reading the relevant code, not just project docs.
- Treat `docs/*` as guidance, but trust executable code over prose when they diverge.
- Do not expose or rewrite secret values from `.env` files. Use env variable names only.
- Preserve the current architecture unless the task explicitly requires a refactor.
- If you change Prisma schema or persistence contracts:
  - update schema, repositories, and mappers consistently
  - generate/apply the appropriate migration if the task requires it
  - account for seed/test impact
- If you add an endpoint, also check:
  - DTO validation
  - auth/role requirements
  - frontend client usage
  - shared types if applicable
- If you add frontend authenticated behavior, account for:
  - cookie-based auth
  - `401` refresh behavior in `apiFetch`
  - middleware redirects
- Follow the local style of the file being edited instead of imposing repo-wide formatting changes.
- Prefer targeted verification over broad commands first, but do not skip verification entirely when behavior changes.

## Known Constraints

- There is no obvious repo-wide formatter/prettier config checked in; formatting is convention-based.
- `pnpm build` depends on building shared packages before app builds.
- API auth depends on cookie-based access and refresh tokens.
- JWT uses RSA keys from env (`JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`).
- Email-related flows depend on external configuration such as `RESEND_API_KEY` and `FRONTEND_URL`.
- The frontend middleware only checks for the `access_token` cookie; auth bugs can appear if API cookie handling changes.
- Some local docs contain older terminology such as "pool"; current code and product language center on "qimela".
- Integration tests require a real PostgreSQL instance and correct `DATABASE_URL`.
- Admin functionality is role-gated with `@Roles(UserRole.ADMIN)`.
- The `jobs` area is minimal right now; do not assume background job processing is fully implemented just because `pg-boss` is configured.
- The repo currently appears clean, but Codex should still assume user changes may exist and avoid reverting unrelated work.

## Task Completion Criteria

A task should usually be considered complete only when all applicable items below are satisfied:

- The change matches the actual architecture of the repo.
- All touched layers are updated consistently.
- User-facing copy remains Spanish where appropriate.
- New or changed behavior is covered by the appropriate test level, or the gap is explicitly called out.
- Relevant verification has been run:
  - `pnpm --filter @qimela/web test` for web-only behavior
  - `pnpm --filter @qimela/api test` for API-only behavior
  - `pnpm typecheck` or targeted typechecks when cross-cutting changes are made
  - Prisma commands when schema changes are involved
- Any important limitation, skipped verification, or env dependency is stated clearly in the handoff.

If a task is documentation-only, completion means the document is accurate to the current codebase, not just aligned with older planning docs.
