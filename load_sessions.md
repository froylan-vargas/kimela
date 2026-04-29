# Implementation Plan: Load Sessions & Per-Session Predictions (KIM-16)

## Overview

This plan covers the full-stack implementation for:

1. Loading the next 3 upcoming sessions when a user selects a subscribed qimela (excluding sessions starting in < 3 minutes)
2. Per-session individual "Guardar" buttons (replacing the global save)
3. Score input validation (integers 0–99, both scores required)
4. UI + API enforcement of the 3-minute pre-match cutoff
5. "Ver todos los partidos" page showing all sessions for the event
6. Toast success/error notifications
7. Logs at meaningful points
8. Integration, API, and unit tests

---

## Backend

### Codebase Context

- DDD layered structure per module: `domain → application → infrastructure → presentation`
- Global `ValidationPipe` (whitelist, transform), `AllExceptionsFilter` (with `code` field)
- `@CurrentUser()` decorator provides `{ id, email, role, emailVerifiedAt }`
- **No Prisma migration needed** — `Session`, `Phase`, `qimela`, `Subscription`, `UserPick`, `PickCategory` all exist

### New Endpoints

| #   | Method | Path                                           | Purpose                               |
| --- | ------ | ---------------------------------------------- | ------------------------------------- |
| 1   | GET    | `/qimelas/:qimelaId/sessions/upcoming`         | Next 3 sessions, cutoff = now + 3 min |
| 2   | GET    | `/qimelas/:qimelaId/sessions`                  | All sessions grouped by phase         |
| 3   | POST   | `/qimelas/:qimelaId/sessions/:sessionId/picks` | Upsert picks for one session          |

> **Route order**: declare `upcoming` before the bare `sessions` route in the controller so the static segment takes priority.

### Files to Create / Modify

```
apps/api/src/modules/qimela/
├── domain/
│   ├── errors/qimela.errors.ts                    (MODIFY — add 4 new error classes)
│   └── session-pick.repository.ts                 (NEW)
├── application/
│   ├── dtos/session-with-pick.dto.ts              (NEW — shared response DTO types)
│   └── use-cases/
│       ├── get-upcoming-sessions.use-case.ts       (NEW)
│       ├── get-upcoming-sessions.use-case.spec.ts  (NEW)
│       ├── get-all-sessions.use-case.ts            (NEW)
│       ├── get-all-sessions.use-case.spec.ts       (NEW)
│       ├── save-session-picks.use-case.ts          (NEW)
│       └── save-session-picks.use-case.spec.ts     (NEW)
├── infrastructure/
│   └── persistence/
│       ├── prisma-session-pick.repository.ts       (NEW)
│       └── prisma-session-pick.repository.integration.spec.ts (NEW)
├── presentation/
│   ├── dtos/save-picks-request.dto.ts             (NEW)
│   └── qimela.controller.ts                       (MODIFY — 3 new handlers)
└── qimela.module.ts                               (MODIFY — register new providers)
```

### Domain Layer

**New error classes** (in `qimela.errors.ts`):

```typescript
export class QimelaHasNoEventError extends Error { ... }
export class SessionPicksDeadlinePassedError extends Error { ... }
export class SessionNotOpenForPicksError extends Error { ... }
export class PickCategoryNotInSessionError extends Error { ... }
```

**New repository interface** (`session-pick.repository.ts`):

```typescript
export const SESSION_PICK_REPOSITORY = Symbol("SESSION_PICK_REPOSITORY");

export interface PickInput {
  pickCategoryId: string;
  value: string | null;
  pickedContenderId: string | null;
}

export interface SavePicksOptions {
  userId: string;
  sessionId: string;
  picks: PickInput[];
}

export interface PickRow {
  pickCategoryId: string;
  label: string;
  valueType: "CONTENDER" | "SCALAR";
  value: string | null;
  pickedContenderId: string | null;
}

export interface SessionPickRepository {
  savePicksForSession(options: SavePicksOptions): Promise<PickRow[]>;
  findPicksForUserAndSession(
    userId: string,
    sessionId: string,
  ): Promise<PickRow[]>;
}
```

### Application Layer

#### `GetUpcomingSessionsUseCase`

1. Load qimela → 404 `"La qimela no existe"` if missing
2. Check user is creator or subscriber → 403 `"No tienes acceso a esta qimela"`
3. `qimela.eventId` null → 422 `"Esta qimela no tiene un evento asociado"`
4. `const cutoff = new Date(Date.now() + 3 * 60 * 1000)`
5. Resolve phase order range from `startPhaseId`/`endPhaseId` (all phases if unset)
6. `session.findMany({ where: { phase.eventId, scheduledAt: { gt: cutoff }, status: { in: ['SCHEDULED'] } }, orderBy: { scheduledAt: 'asc' }, take: 3, include: { contenders, phase } })`
7. Fetch user picks for those sessions
8. Map to `SessionWithPickDto[]`
9. Log: qimelaId, userId, cutoff, result count

#### `GetAllSessionsUseCase`

- Same access guards (steps 1–3 above)
- Load all phases in range ordered by `order ASC`
- Load all sessions with contenders ordered by `scheduledAt ASC`
- Fetch all user picks for the session set
- Group into `PhaseSessionsGroupDto[]`

#### `SaveSessionPicksUseCase`

1. Load qimela → 404
2. User access check → 403
3. `eventId` null → 422
4. Load session with phase and sessionCategories → 404 `"La sesión no existe"`
5. `session.phase.eventId !== qimela.eventId` → 422
6. **Deadline check**: `session.scheduledAt.getTime() - Date.now() < 3 * 60 * 1000` → 422 `{ code: 'PICKS_DEADLINE_PASSED', message: 'No puedes registrar pronósticos para partidos que comienzan en menos de 3 minutos' }`
7. **Status check**: `session.status !== 'SCHEDULED'` → 422 `{ code: 'PICKS_SESSION_NOT_OPEN', message: 'Solo puedes registrar pronósticos en sesiones programadas' }`
8. **SCALAR range check**: `!Number.isInteger(n) || n < 0 || n > 99` → 400 `"El marcador debe ser un número entero entre 0 y 99"`
9. **Category membership**: pickCategoryId must be in `session.sessionCategories` → 422 `{ code: 'PICK_CATEGORY_NOT_IN_SESSION', message: 'La categoría de pronóstico no pertenece a esta sesión' }`
10. `sessionPickRepository.savePicksForSession({ userId, sessionId, picks })`

### Infrastructure Layer

**`PrismaSessionPickRepository`**:

```typescript
async savePicksForSession(options: SavePicksOptions): Promise<PickRow[]> {
  await this.prisma.$transaction(
    options.picks.map(pick => this.prisma.userPick.upsert({
      where: { userId_sessionId_pickCategoryId: { userId: options.userId, sessionId: options.sessionId, pickCategoryId: pick.pickCategoryId } },
      create: { userId: options.userId, sessionId: options.sessionId, ...pick },
      update: { value: pick.value, pickedContenderId: pick.pickedContenderId },
    }))
  );
  return this.findPicksForUserAndSession(options.userId, options.sessionId);
}
```

**Module wiring** in `QimelaInfrastructureModule`:

```typescript
{ provide: SESSION_PICK_REPOSITORY, useClass: PrismaSessionPickRepository }
```

### Presentation Layer

**`SavePicksRequestDto`** (`save-picks-request.dto.ts`):

```typescript
class PickInputDto {
  @IsUUID() pickCategoryId!: string;
  @IsOptional() @IsString() value?: string;
  @IsOptional() @IsUUID() pickedContenderId?: string;
}

class SavePicksRequestDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PickInputDto)
  picks!: PickInputDto[];
}
```

> Numeric range validation lives in the use case (not DTO) because `value` is typed as `string` for both SCALAR and CONTENDER categories.

**Controller additions** (`qimela.controller.ts`):

```typescript
@Get(':qimelaId/sessions/upcoming')
async getUpcomingSessions(
  @Param('qimelaId', ParseUUIDPipe) qimelaId: string,
  @CurrentUser() user: CurrentUserPayload,
): Promise<{ data: SessionWithPickDto[] }>

@Get(':qimelaId/sessions')
async getAllSessions(
  @Param('qimelaId', ParseUUIDPipe) qimelaId: string,
  @CurrentUser() user: CurrentUserPayload,
): Promise<{ data: PhaseSessionsGroupDto[] }>

@Post(':qimelaId/sessions/:sessionId/picks')
@HttpCode(HttpStatus.OK)
async saveSessionPicks(
  @Param('qimelaId', ParseUUIDPipe) qimelaId: string,
  @Param('sessionId', ParseUUIDPipe) sessionId: string,
  @CurrentUser() user: CurrentUserPayload,
  @Body() body: SavePicksRequestDto,
): Promise<{ data: { sessionId: string; picks: PickDto[] } }>
```

### Error Table

| Condition                 | HTTP | Code                           | Message                                                                               |
| ------------------------- | ---- | ------------------------------ | ------------------------------------------------------------------------------------- |
| qimela not found          | 404  | —                              | `"La qimela no existe"`                                                               |
| Not creator/subscriber    | 403  | —                              | `"No tienes acceso a esta qimela"`                                                    |
| qimela has no event       | 422  | `QIMELA_NO_EVENT`              | `"Esta qimela no tiene un evento asociado"`                                           |
| Session not found         | 404  | —                              | `"La sesión no existe"`                                                               |
| Deadline passed (< 3 min) | 422  | `PICKS_DEADLINE_PASSED`        | `"No puedes registrar pronósticos para partidos que comienzan en menos de 3 minutos"` |
| Session not SCHEDULED     | 422  | `PICKS_SESSION_NOT_OPEN`       | `"Solo puedes registrar pronósticos en sesiones programadas"`                         |
| Score out of range        | 400  | —                              | `"El marcador debe ser un número entero entre 0 y 99"`                                |
| Category not in session   | 422  | `PICK_CATEGORY_NOT_IN_SESSION` | `"La categoría de pronóstico no pertenece a esta sesión"`                             |

### Backend Test Plan

#### Unit tests (Jest, no DB)

**`get-upcoming-sessions.use-case.spec.ts`**

- throws 404 when qimela not found
- throws 403 when user is neither creator nor subscriber
- throws 422 when qimela has no eventId
- returns empty array when no sessions are past the cutoff
- returns at most 3 sessions when 5 exist
- includes `userPick: null` when user has no picks
- includes pick data when user has picks
- asserts `scheduledAt.gt` passed to Prisma equals cutoff

**`get-all-sessions.use-case.spec.ts`**

- throws 404/403/422 (same guards)
- groups sessions by phase correctly (2 phases → 2 groups)
- phases returned in `order ASC`
- sessions within each phase ordered by `scheduledAt`
- picks attached to correct sessions
- returns empty array when event has no sessions

**`save-session-picks.use-case.spec.ts`**

- throws 404/403/422 (same guards)
- throws 404 when session not found
- throws 422 `PICKS_DEADLINE_PASSED` when session starts in 2 minutes
- throws 422 `PICKS_SESSION_NOT_OPEN` for LIVE and COMPLETED sessions
- throws 400 for values `"-1"`, `"100"`, `"2.5"`, `"abc"`
- allows values `"0"` and `"99"` (boundary cases)
- throws 422 `PICK_CATEGORY_NOT_IN_SESSION` for unknown category
- calls repository with correct arguments
- returns picks from repository

**`qimela.controller.spec.ts` additions**

- `getUpcomingSessions` delegates to use case with correct args
- `getAllSessions` delegates to use case with correct args
- `saveSessionPicks` delegates to use case with all params and returns 200

#### Integration tests (real PostgreSQL)

**`prisma-session-pick.repository.integration.spec.ts`**

- creates new picks when none exist
- updates existing picks on second call (upsert)
- handles mixed SCALAR and CONTENDER picks in one call
- returns empty array when no picks exist
- returns picks with correct label/valueType/value
- does not affect another user's picks for the same session

### Backend Implementation Order

1. Domain errors (`qimela.errors.ts`)
2. Repository interface (`session-pick.repository.ts`)
3. Response DTO types (`session-with-pick.dto.ts`)
4. Repository implementation + integration test (`PrismaSessionPickRepository`)
5. Module wiring (`QimelaInfrastructureModule`)
6. `GetUpcomingSessionsUseCase` + unit tests
7. `GetAllSessionsUseCase` + unit tests
8. `SavePicksRequestDto`
9. `SaveSessionPicksUseCase` + unit tests
10. Controller additions + controller unit test
11. `QimelaModule` provider registration

---

## Frontend

### Codebase Context

- Next.js 15+ App Router with route groups; `(app)` group for authenticated views
- TanStack React Query for data fetching; `AuthContext`, `QimelaContext`, `ToastContext` for global state
- Custom `apiFetch` wrapper in `/src/lib/apiClient.ts` with session refresh and error parsing
- SCSS Modules with `_variables.scss` (`$color-primary: #ffd100`, glassmorphism surfaces)
- Vitest + React Testing Library; hook tests wrap with `QueryClientProvider`
- Toast context auto-dismisses after 4000ms; `useToast()` provides `toast(message, variant)`
- `QimelaContext.selectedQimela` has `id` and `eventId`

### Files to Create / Modify

**New files (13 total)**:

1. `/src/types/prediction.ts`
2. `/src/hooks/useUpcomingSessions.ts`
3. `/src/hooks/useUpcomingSessions.test.ts`
4. `/src/hooks/useSavePrediction.ts`
5. `/src/hooks/useSavePrediction.test.ts`
6. `/src/components/qimela/SessionCard/SessionCard.tsx`
7. `/src/components/qimela/SessionCard/SessionCard.test.tsx`
8. `/src/components/qimela/SessionCard/SessionCard.module.scss`
9. `/src/components/qimela/UpcomingSessions/UpcomingSessions.tsx`
10. `/src/components/qimela/UpcomingSessions/UpcomingSessions.test.tsx`
11. `/src/components/qimela/UpcomingSessions/UpcomingSessions.module.scss`
12. `/src/app/(app)/qimela/[id]/sessions/page.tsx`
13. `/src/app/(app)/qimela/[id]/sessions/page.test.tsx`

**Modified files (3 total)**:

1. `/src/lib/apiClient.ts` — add `predictionsApi` with 3 methods
2. `/src/components/dashboard/ParticipantDashboard.tsx` — render `UpcomingSessions`
3. `/src/app/(app)/dashboard/page.module.scss` — layout adjustments if needed

### Component Breakdown

#### SessionCard

**Props**: `{ session: Session; qimelaId: string; onSaveSuccess?: () => void }`

- Renders home/away team names, logos, scheduled date/time
- Two score inputs (44x44px, integer only, 0–99)
- Individual "Guardar" button — disabled when: `!isValid || isTooClose || isSaving`
- Shows inline error below inputs for invalid scores (red), time warning when < 3 min (gray)
- Calls `useSavePrediction` mutation; shows success/error toast after response
- Client-side logs: mount, input change, save attempt, result

#### UpcomingSessions

**Props**: `{ qimelaId: string; eventId: string }`

- Uses `useUpcomingSessions(limit=3)` to fetch next 3 sessions
- Renders loading spinner, error message, or list of `SessionCard` components
- "Ver todos los partidos" link → `/qimela/[id]/sessions`

#### AllSessions Page

**Path**: `/src/app/(app)/qimela/[id]/sessions/page.tsx`

- Gets `qimelaId` from route params, `eventId` from `QimelaContext.selectedQimela`
- Uses `useUpcomingSessions` with no limit to fetch all event sessions (grouped by phase)
- Same glassmorphism card styling as dashboard; includes back button/breadcrumb
- Each session shows `SessionCard` with individual "Guardar"

### Custom Hooks

#### useUpcomingSessions

```typescript
function useUpcomingSessions(opts: {
  qimelaId: string;
  eventId: string;
  limit?: number; // 3 for dashboard, omit for all-sessions page
}): UseQueryResult<Session[], Error>;
```

- Query key: `["upcoming-sessions", qimelaId, eventId, limit]`
- `staleTime: 60_000`; disabled when qimelaId/eventId missing
- **Client-side filter**: `sessions.filter(s => new Date(s.scheduledAt).getTime() - Date.now() >= 3 * 60 * 1000)`

#### useSavePrediction

```typescript
function useSavePrediction(qimelaId: string): UseMutationResult<..., ApiError, SavePredictionBody>
```

- Calls `POST /qimelas/:qimelaId/sessions/:sessionId/picks`
- On success: `queryClient.invalidateQueries({ queryKey: ["upcoming-sessions", qimelaId] })`
- Returns error to component for toast handling

### API Client additions

```typescript
export const predictionsApi = {
  getUpcomingSessions(qimelaId: string): Promise<{ data: Session[] }> {
    return apiFetch(
      `/qimelas/${encodeURIComponent(qimelaId)}/sessions/upcoming`,
    );
  },
  getAllSessions(qimelaId: string): Promise<{ data: PhaseSessionsGroup[] }> {
    return apiFetch(`/qimelas/${encodeURIComponent(qimelaId)}/sessions`);
  },
  saveSessionPicks(
    qimelaId: string,
    sessionId: string,
    picks: PickInput[],
  ): Promise<{ data: { sessionId: string; picks: PickDto[] } }> {
    return apiFetch(
      `/qimelas/${encodeURIComponent(qimelaId)}/sessions/${encodeURIComponent(sessionId)}/picks`,
      { method: "POST", body: JSON.stringify({ picks }) },
    );
  },
};
```

### Validation Logic

```typescript
// Score validation
const isValidScore = (v: string) =>
  /^\d+$/.test(v) && parseInt(v, 10) >= 0 && parseInt(v, 10) < 100;
const isValid = isValidScore(homeScore) && isValidScore(awayScore);

// Time check
const isTooClose =
  new Date(session.scheduledAt).getTime() - Date.now() < 3 * 60 * 1000;

// Button gate
const isDisabled = isSaving || isTooClose || !isValid;
```

Both client and server validate the 3-minute rule: client for UX, server as the authoritative check.

### Toast Strategy

| Event                    | Variant | Message                                                                         |
| ------------------------ | ------- | ------------------------------------------------------------------------------- |
| Save success             | success | "Predicción guardada exitosamente"                                              |
| `PICKS_DEADLINE_PASSED`  | error   | "El partido comienza en menos de 3 minutos. No se puede guardar la predicción." |
| `PICKS_SESSION_NOT_OPEN` | error   | "El partido ya ha comenzado. No se puede guardar la predicción."                |
| Score out of range (API) | error   | "Los scores deben estar entre 0 y 99."                                          |
| 403 Unauthorized         | error   | "No tienes permiso para hacer predicciones en esta qimela."                     |
| Generic/network error    | error   | "No se pudo guardar la predicción. Intenta de nuevo."                           |

Inline messages (not toasts): score validation errors and "< 3 min" warning shown directly below inputs.

### Routing

- **New route**: `/src/app/(app)/qimela/[id]/sessions/page.tsx`
- **Link in UpcomingSessions**: `<Link href={/qimela/${qimelaId}/sessions}>Ver todos los partidos</Link>`
- No changes to existing routes

### Frontend Test Plan

#### Hook unit tests

**`useUpcomingSessions.test.ts`**

1. Fetches from correct endpoint with qimelaId
2. Client-side filter excludes sessions starting in < 3 minutes
3. Returns `Session[]` on success; error state on API failure
4. Disabled when qimelaId or eventId missing
5. Uses correct query key

**`useSavePrediction.test.ts`**

1. Calls POST endpoint with correct URL/body
2. Returns pick data on success
3. Handles `PICKS_DEADLINE_PASSED` error code
4. Invalidates `upcoming-sessions` queries after success
5. Does not invalidate on error

#### Component integration tests (RTL)

**`SessionCard.test.tsx`** (15 cases)

1. Renders home/away team names and scheduled date
2. Renders two score inputs and "Guardar" button
3. Button disabled when homeScore invalid (empty, non-numeric, < 0, >= 100)
4. Button disabled when awayScore invalid
5. Button enabled when both scores valid (0–99)
6. Shows inline error for invalid score
7. Shows inline warning when session starts in < 3 min
8. Button disabled when < 3 min to start
9. Calls mutation with correct body on click
10. Button shows "Guardando..." during API call
11. Success toast shown on save success
12. `PICKS_DEADLINE_PASSED` error toast shown on API error
13. Inputs cleared after successful save
14. Input rejects non-digit keypresses
15. `onSaveSuccess` callback fired on success

**`UpcomingSessions.test.tsx`** (7 cases)

1. Renders loading spinner while fetching
2. Renders error message on failure
3. Renders SessionCard for each session
4. Passes correct props to SessionCard
5. "Ver todos" link has correct href
6. Renders card header with title and icon
7. Empty state when no sessions returned

**`sessions/page.test.tsx`** (7 cases)

1. Renders heading with event name
2. Calls hook with no limit (all sessions)
3. Renders SessionCard per session
4. Shows "No hay partidos disponibles" when empty
5. Loads qimelaId from params
6. Loading state while fetching
7. Error state on failure

### Frontend Implementation Phases

| Phase                                        | Tasks                                                  | Est. |
| -------------------------------------------- | ------------------------------------------------------ | ---- |
| 1 — Types & API                              | `/src/types/prediction.ts`, extend `apiClient.ts`      | 1-2h |
| 2 — Hooks                                    | `useUpcomingSessions`, `useSavePrediction`, hook tests | 2-3h |
| 3 — SessionCard                              | Component + SCSS + 15 tests                            | 3-4h |
| 4 — UpcomingSessions                         | Component + SCSS + 7 tests                             | 2-3h |
| 5 — AllSessions Page + Dashboard integration | Page + tests + wire into ParticipantDashboard          | 2-3h |
| 6 — Manual QA & polish                       | Full flow, edge cases, responsive, a11y                | 2-3h |
| 7 — Review & merge                           | PR with test results                                   | 1h   |

---

## Shared Contract: Session Type

Backend must return sessions including:

```typescript
interface Session {
  id: string; // UUID
  name: string; // "Real Madrid vs Bayern"
  scheduledAt: string; // ISO 8601 UTC
  status: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED" | "POSTPONED";
  home: { id: string; name: string; imgUrl?: string };
  away: { id: string; name: string; imgUrl?: string };
  picks?: PickRow[]; // User's existing picks for this session (if any)
}
```

Backend groups all sessions endpoint:

```typescript
interface PhaseSessionsGroup {
  phaseId: string;
  phaseName: string;
  phaseOrder: number;
  sessions: Session[];
}
```
