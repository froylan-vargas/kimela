# Backend Implementation Plan — Sessions & Picks Feature (KIM-16)

## 1. Context & Codebase Summary

**Architecture** — DDD layered structure per module: `domain → application → infrastructure → presentation`. `QimelaInfrastructureModule` re-exports `AdminInfrastructureModule`, so `SESSION_REPOSITORY` is already available in the qimela module context. Global `ValidationPipe` (whitelist, transform), global `AllExceptionsFilter` (handles `code` field), `@CurrentUser()` decorator provides `{ id, email, role, emailVerifiedAt }`.

**Existing relevant models:** `Session` (id, name, scheduledAt, status, phaseId, sportId), `Phase` (id, name, order, status, eventId), `qimela` (eventId, startPhaseId, endPhaseId), `Subscription` (userId, qimelaId), `UserPick` (userId, sessionId, pickCategoryId, value?, pickedContenderId?), `PickCategory` (id, name, label, valueType CONTENDER|SCALAR, points, isDefault).

**No Prisma migration needed.** All required tables exist.

---

## 2. New Endpoints (all under `QimelaController` at `/qimelas`)

| #   | Method | Path                                           | Purpose                               |
| --- | ------ | ---------------------------------------------- | ------------------------------------- |
| 1   | GET    | `/qimelas/:qimelaId/sessions/upcoming`         | Next 3 sessions, cutoff = now + 3 min |
| 2   | GET    | `/qimelas/:qimelaId/sessions`                  | All sessions grouped by phase         |
| 3   | POST   | `/qimelas/:qimelaId/sessions/:sessionId/picks` | Upsert picks for one session          |

---

## 3. File Structure — New Files

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

---

## 4. Domain Layer

### New error classes in `qimela.errors.ts`

```typescript
export class QimelaHasNoEventError extends Error { ... }
export class SessionPicksDeadlinePassedError extends Error { ... }
export class SessionNotOpenForPicksError extends Error { ... }
export class PickCategoryNotInSessionError extends Error { ... }
```

### New repository interface — `session-pick.repository.ts`

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

---

## 5. Application Layer

### `get-upcoming-sessions.use-case.ts` — Logic

1. `qimelaRepository.findById(qimelaId)` → `NotFoundException("La qimela no existe")` if missing
2. Check `subscription.findFirst({ userId, qimelaId })` OR `qimela.creatorId === userId` → `ForbiddenException("No tienes acceso a esta qimela")`
3. `qimela.eventId` null → `UnprocessableEntityException("Esta qimela no tiene un evento asociado")`
4. `const cutoff = new Date(Date.now() + 3 * 60 * 1000)`
5. Resolve phase order range from `startPhaseId`/`endPhaseId` (or use all phases if not set)
6. `prisma.session.findMany({ where: { phase: { eventId, order: { gte, lte } }, status: { in: ['SCHEDULED','LIVE'] }, scheduledAt: { gt: cutoff } }, orderBy: { scheduledAt: 'asc' }, take: 3, include: { contenders: { include: { contender: true } }, phase: true } })`
7. Fetch `userPick.findMany({ where: { userId, sessionId: { in: [...] } }, include: { pickCategory: true } })`
8. Map to `SessionWithPickDto[]`
9. Log: entry with qimelaId/userId/cutoff, result count

### `get-all-sessions.use-case.ts` — Logic

Same access guards (steps 1–3 above), then:

- Load all phases in range ordered by `order ASC`
- Load all sessions with contenders for those phases ordered `scheduledAt ASC`
- Fetch all user picks for the session set
- Group into `PhaseSessionsGroupDto[]`

### `save-session-picks.use-case.ts` — Logic

1. Load qimela → 404 if missing
2. User access check → 403
3. `eventId` null check → 422
4. `prisma.session.findUnique({ include: { phase: true, sessionCategories: { include: { pickCategory: true } } } })` → 404 if missing
5. `session.phase.eventId !== qimela.eventId` → 422
6. **Deadline check:** `session.scheduledAt.getTime() - Date.now() < 3 * 60 * 1000` → `UnprocessableEntityException({ code: 'PICKS_DEADLINE_PASSED', message: 'No puedes registrar pronósticos para partidos que comienzan en menos de 3 minutos' })`
7. **Status check:** `session.status !== 'SCHEDULED'` → `UnprocessableEntityException({ code: 'PICKS_SESSION_NOT_OPEN', message: 'Solo puedes registrar pronósticos en sesiones programadas' })`
8. **SCALAR range check:** For each SCALAR pick, `const n = Number(value)` — if `!Number.isInteger(n) || n < 0 || n > 99` → `BadRequestException("El marcador debe ser un número entero entre 0 y 99")`
9. **Category membership check:** Each `pickCategoryId` must appear in `session.sessionCategories` → `UnprocessableEntityException({ code: 'PICK_CATEGORY_NOT_IN_SESSION', message: 'La categoría de pronóstico no pertenece a esta sesión' })`
10. `sessionPickRepository.savePicksForSession({ userId, sessionId, picks })`

---

## 6. Infrastructure Layer

### `PrismaSessionPickRepository`

`savePicksForSession` runs a `prisma.$transaction(picks.map(pick => prisma.userPick.upsert({ where: { userId_sessionId_pickCategoryId: ... }, create: ..., update: ... })))` then calls `findPicksForUserAndSession` to return the fresh state.

### Module wiring

`QimelaInfrastructureModule` — add:

```typescript
{ provide: SESSION_PICK_REPOSITORY, useClass: PrismaSessionPickRepository }
// and export SESSION_PICK_REPOSITORY
```

---

## 7. Presentation Layer

### `save-picks-request.dto.ts`

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

Numeric range validation is intentionally kept in the use case, not the DTO, because `value` is typed as `string` (shared for both SCALAR and CONTENDER categories).

### Controller additions (`qimela.controller.ts`)

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

**Route order:** Declare `upcoming` route before the bare `sessions` route so the static segment takes priority over dynamic ones.

---

## 8. Error Table

| Condition                 | HTTP | Code                           | Spanish message                                                                       |
| ------------------------- | ---- | ------------------------------ | ------------------------------------------------------------------------------------- |
| qimela not found          | 404  | —                              | `"La qimela no existe"`                                                               |
| Not creator/subscriber    | 403  | —                              | `"No tienes acceso a esta qimela"`                                                    |
| qimela has no event       | 422  | `QIMELA_NO_EVENT`              | `"Esta qimela no tiene un evento asociado"`                                           |
| Session not found         | 404  | —                              | `"La sesión no existe"`                                                               |
| Deadline passed (< 3 min) | 422  | `PICKS_DEADLINE_PASSED`        | `"No puedes registrar pronósticos para partidos que comienzan en menos de 3 minutos"` |
| Session not SCHEDULED     | 422  | `PICKS_SESSION_NOT_OPEN`       | `"Solo puedes registrar pronósticos en sesiones programadas"`                         |
| Score out of range        | 400  | —                              | `"El marcador debe ser un número entero entre 0 y 99"`                                |
| Category not in session   | 422  | `PICK_CATEGORY_NOT_IN_SESSION` | `"La categoría de pronóstico no pertenece a esta sesión"`                             |

---

## 9. Test Plan

### Unit tests (Jest, no DB)

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
- throws 400 for value `"-1"`, `"100"`, `"2.5"`, `"abc"`
- allows values `"0"` and `"99"` (boundary cases)
- throws 422 `PICK_CATEGORY_NOT_IN_SESSION` for unknown category
- calls repository with correct arguments
- returns picks from repository

**`qimela.controller.spec.ts` additions**

- `getUpcomingSessions` delegates to use case with correct args and returns result
- `getAllSessions` delegates to use case with correct args and returns result
- `saveSessionPicks` delegates to use case with all params and returns 200

### Integration tests (real PostgreSQL)

**`prisma-session-pick.repository.integration.spec.ts`** — same setup pattern as `prisma-qimela.repository.integration.spec.ts`

- `savePicksForSession` — creates new picks when none exist
- `savePicksForSession` — updates existing picks on second call (upsert)
- `savePicksForSession` — handles mixed SCALAR and CONTENDER picks in one call
- `findPicksForUserAndSession` — returns empty array when no picks exist
- `findPicksForUserAndSession` — returns picks with correct label/valueType/value
- `savePicksForSession` — does not affect another user's picks for the same session

---

## 10. Implementation Order

1. Domain errors (`qimela.errors.ts`)
2. Repository interface (`session-pick.repository.ts`)
3. Response DTO types (`session-with-pick.dto.ts`)
4. Repository implementation + integration test (`PrismaSessionPickRepository`)
5. Module wiring (`QimelaInfrastructureModule`)
6. `GetUpcomingSessionsUseCase` + unit tests
7. `GetAllSessionsUseCase` + unit tests
8. `SavePicksRequestDto`
9. `SaveSessionPicksUseCase` + unit tests
10. Controller additions + controller unit test additions
11. `QimelaModule` provider registration
12. Integration tests
