# Feature load events with the admin role.

## Definition

I want to be able to load events with the admin role.

## Notes

First I want to have a dropdown to select the sport.
Then I want to have a dropdown to select the events, we will skip the leagues since we don't need the leagues filter here.
Only Active events will be loaded.
An ADMIN role won't have access to normal user ui screens and vice versa.
So you need to create admin flow to load events and manage them.

## Implementation

### Frontend

#### Route Structure

The admin section lives in a dedicated Next.js route group `(admin)`, parallel to the existing `(app)` group. This keeps admin and user screens completely isolated with separate layouts, headers, and guards.

New files/directories to create under `apps/web/src/app/`:

```
(admin)/
  layout.tsx                         -- Admin layout with role guard and admin-specific header
  layout.module.scss
  events/
    page.tsx                         -- Admin "Load Events" page (sport selector + event list)
    page.module.scss
```

Route: `/admin/events`

The middleware at `apps/web/src/middleware.ts` already protects all non-public routes by checking for a valid `access_token` cookie. No change is needed there. Role enforcement is handled at the layout level.

---

#### Layout & Role Guard

**`apps/web/src/app/(admin)/layout.tsx`**

- Uses the existing `useRequireRole("ADMIN")` hook from `apps/web/src/hooks/useAuth.ts` to redirect non-admins to `/login`.
- Renders a minimal `AdminHeader` instead of the user-facing `Header` (no `QimelaSelector`, no qimela context).
- Does not wrap children in `QimelaProvider` — admin screens have no need for qimela selection state.

**`apps/web/src/components/admin/AdminHeader/AdminHeader.tsx`**

- Logo + admin navigation links + `UserProfile`. Follows the same composition pattern as the existing `Header.tsx`.
- `AdminHeader.module.scss`

---

#### Pages

**`apps/web/src/app/(admin)/events/page.tsx`**

Client component. Orchestrates the two-step selection flow:

1. Renders `SportSelect`. On selection, stores the chosen `sportId` in local `useState`.
2. Once a sport is selected, renders `EventList` passing the `sportId`. The event list area is not rendered until a sport is chosen.

---

#### Components

All admin-specific components live under `apps/web/src/components/admin/`:

**`SportSelect/SportSelect.tsx`**

- Fetches sports via the `useSports` hook.
- Renders a `<select>` populated with sport names/ids.
- Props: `value: string | null`, `onChange: (sportId: string) => void`.
- `SportSelect.module.scss`

**`EventList/EventList.tsx`**

- Receives `sportId: string` as a prop.
- Fetches active events via the `useAdminEvents(sportId)` hook.
- Renders a list/table of events showing event name, sport, and status.
- Shows a loading skeleton while fetching and an empty state when no events are found.
- `EventList.module.scss`

---

#### Data Fetching Hooks

New hooks under `apps/web/src/hooks/`:

**`useSports.ts`**

- Uses `useQuery` from TanStack Query.
- Query key: `["sports"]`.
- Fetches `GET /sports` via `apiFetch` from `apps/web/src/lib/apiClient.ts`.
- `staleTime`: 60 minutes.

**`useAdminEvents.ts`**

- Uses `useQuery` from TanStack Query.
- Query key: `["admin", "events", sportId]`.
- Fetches `GET /admin/events?sportId={sportId}&status=ACTIVE` via `apiFetch`.
- Enabled only when `sportId` is non-null (`enabled: !!sportId`).
- `staleTime`: 60 minutes.

---

#### Type Definitions

New type files under `apps/web/src/types/`:

- **`sport.ts`** — `Sport: { id: string; name: string; }`
- **`event.ts`** — `Event: { id: string; name: string; sportId: string; status: "ACTIVE" | string; }`

---

#### API Client Additions

`apps/web/src/lib/apiClient.ts` — add two namespace objects following the existing `authApi` pattern:

- `sportsApi.list()` — `GET /sports`
- `adminApi.listEvents(sportId: string)` — `GET /admin/events?sportId={sportId}&status=ACTIVE`

---

#### Auth Wiring Summary

| Layer                      | Mechanism                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Cookie presence            | `middleware.ts` — redirects to `/login` if no `access_token` cookie                                                       |
| ADMIN role check           | `useRequireRole("ADMIN")` in `(admin)/layout.tsx` — redirects non-admins                                                  |
| Component-level (optional) | `RoleGuard` from `apps/web/src/components/auth/RoleGuard.tsx` can wrap UI fragments that should only render for `"ADMIN"` |

---

### Backend

#### Overview

Two read-only endpoints are needed under an `/admin` prefix. Both are protected by the existing `JwtAuthGuard` (global) and the existing `RolesGuard` (global) — no new guards need to be created. Applying `@Roles(UserRole.ADMIN)` at the controller class level is all that is required to restrict access.

The implementation follows the same DDD layering used in the `qimela` module: `domain → application → infrastructure → presentation`.

---

#### Endpoints

**1. List sports**

```
GET /admin/sports
```

- Returns all sports (id, name, imgUrl) — no filtering, feeds the sport dropdown.
- No query parameters.
- Response shape: `{ data: SportDto[] }`.

**2. List active events by sport**

```
GET /admin/events?sportId=<uuid>
```

- `sportId` is a required query parameter validated with `@IsUUID()` + `@IsNotEmpty()`.
- Filters events where `status = ACTIVE` and the event's league belongs to the given sport (`league.sportId = sportId`). League is not exposed as a filter to the caller — it is purely a join path.
- Response shape: `{ data: EventDto[] }` where each item includes: `id`, `name`, `startsAt`, `endsAt`, `status`, `leagueId`, `leagueName`.

---

#### New module: `admin`

All files live under `apps/api/src/modules/admin/`.

**Presentation layer — `presentation/`**

| File                             | Purpose                                                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `admin.module.ts`                | Root NestJS module. Imports `AdminInfrastructureModule`, provides use cases, declares `AdminController`. |
| `admin.controller.ts`            | `@Controller('admin')` + `@Roles(UserRole.ADMIN)` at class level. Exposes the two GET routes.            |
| `dtos/get-events-request.dto.ts` | Request DTO for `GET /admin/events`. Field `sportId: string` with `@IsUUID()` + `@IsNotEmpty()`.         |

**Application layer — `application/`**

| File                                               | Purpose                                                                                   |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `use-cases/get-sports.use-case.ts`                 | Injects `SPORT_REPOSITORY`. Calls `findAll()`. Returns `SportDto[]`.                      |
| `use-cases/get-active-events-by-sport.use-case.ts` | Injects `EVENT_REPOSITORY`. Calls `findActiveBySport({ sportId })`. Returns `EventDto[]`. |
| `dtos/sport.dto.ts`                                | `SportDto`: `id`, `name`, `imgUrl`.                                                       |
| `dtos/event.dto.ts`                                | `EventDto`: `id`, `name`, `startsAt`, `endsAt`, `status`, `leagueId`, `leagueName`.       |
| `mappers/sport.mapper.ts`                          | Maps domain `SportEntity` → `SportDto`.                                                   |
| `mappers/event.mapper.ts`                          | Maps domain `EventEntity` → `EventDto`.                                                   |

**Domain layer — `domain/`**

| File                  | Purpose                                                                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sport.entity.ts`     | Plain domain entity: `id`, `name`, `imgUrl`.                                                                                                         |
| `event.entity.ts`     | Plain domain entity: `id`, `name`, `startsAt`, `endsAt`, `status`, `leagueId`, `leagueName`.                                                         |
| `sport.repository.ts` | Interface `SportRepository` with `SPORT_REPOSITORY` symbol token. Method: `findAll(): Promise<SportEntity[]>`.                                       |
| `event.repository.ts` | Interface `EventRepository` with `EVENT_REPOSITORY` symbol token. Method: `findActiveBySport(options: { sportId: string }): Promise<EventEntity[]>`. |

**Infrastructure layer — `infrastructure/`**

| File                                      | Purpose                                                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `admin.infrastructure.module.ts`          | Binds `SPORT_REPOSITORY` → `PrismaSportRepository` and `EVENT_REPOSITORY` → `PrismaEventRepository`. Exports both.              |
| `persistence/prisma-sport.repository.ts`  | `prisma.sport.findMany()` ordered by `name asc`.                                                                                |
| `persistence/prisma-event.repository.ts`  | `prisma.event.findMany({ where: { status: 'ACTIVE', league: { sportId } }, include: { league: { select: { name: true } } } })`. |
| `persistence/sport-persistence.mapper.ts` | Maps Prisma sport record → `SportEntity`.                                                                                       |
| `persistence/event-persistence.mapper.ts` | Maps Prisma event + nested league record → `EventEntity`.                                                                       |

---

#### Auth / role guard wiring

- `JwtAuthGuard` and `RolesGuard` are already registered globally via `APP_GUARD` in `AppModule` — no changes needed to either guard.
- Applying `@Roles(UserRole.ADMIN)` at the `AdminController` class level is sufficient; the global `RolesGuard` picks up the metadata automatically.
- Import `UserRole` from `modules/users/domain/user-role.enum` and `Roles` from `modules/auth/presentation/decorators/roles.decorator`.

---

#### `AppModule` change

`AdminModule` must be added to the `imports` array in `apps/api/src/app.module.ts`.

---

#### No schema or migration changes needed

`Event`, `League`, and `Sport` are already in the schema with all required fields. The query joins `Event → League → Sport` through existing Prisma relations — no new columns or tables are required.
