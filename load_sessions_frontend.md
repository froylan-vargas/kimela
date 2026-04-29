# Frontend Implementation Plan: Load Sessions & Per-Session Predictions (KIM-16)

## 1. Codebase Findings Summary

### Current Architecture

- **Framework**: Next.js 15+ with App Router and route groups (`(app)`, `(auth)`, `(admin)`, `(public)`)
- **Authentication**: Fully implemented with `AuthContext`, role-based RoleGuard, middleware, and automatic session refresh
- **State Management**: TanStack React Query for data fetching; React Context for global state (Auth, qimela, Toast)
- **API Client**: Custom `apiFetch` wrapper with built-in session refresh, error parsing, and 401 retry logic
- **Styling**: SCSS + CSS Modules with shared `_variables.scss` (colors, spacing, typography, z-index)
- **Testing**: Vitest + React Testing Library; patterns use `QueryClientProvider` wrapper for hook tests
- **Notifications**: Toast context-based with auto-dismissal (4000ms), max 3 toasts queued

### Current Session Handling

- `Session` type at `/src/types/session.ts`: includes `id`, `name`, `scheduledAt`, `status`, `home`, `away` (SessionContender with name, id, imgUrl)
- `useSessions` hook at `/src/hooks/useSessions.ts`: currently admin-only, fetches from `/admin/events/{eventId}/phases/{phaseId}/sessions`
- No participant-facing session display component exists yet
- No prediction types, hooks, or API endpoints exist

### Existing UI/UX Patterns (from mockup)

- **Glassmorphism cards**: `$color-surface: rgba(255, 255, 255, 0.75)` with `backdrop-filter: blur(24px)`
- **Primary button**: `$color-primary: #ffd100` with gradient, shadow, and hover transform
- **Score inputs**: 44x44px, rounded 12px, white bg on focus with yellow border and light yellow shadow
- **Spanish UI labels throughout**
- **Responsive grid**: 2-column desktop (Leaderboard 1fr | Next Matches 2fr), 1-column mobile
- **Glassmorphic borders**: `rgba(255, 255, 255, 0.8)` with subtle glow on hover

### Key Integration Points

- **Dashboard page**: `/src/app/(app)/dashboard/page.tsx` — shows ParticipantDashboard or CreatorDashboard based on role
- **QimelaContext**: Provides `selectedQimela` (has qimelaId + eventId) and `selectQimela()` function
- **ToastContext**: Already wired; `useToast()` hook provides `toast(message, "success"|"error")` function
- **apiClient**: Extensible pattern (qimelasApi, adminApi, authApi objects); uses `apiFetch` wrapper

---

## 2. Files to Create or Modify

### New Files (13 total)

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

### Modified Files (3 total)

1. `/src/lib/apiClient.ts` — Add `predictionsApi` object with 2 methods
2. `/src/components/dashboard/ParticipantDashboard.tsx` — Import and render `UpcomingSessions`
3. `/src/app/(app)/dashboard/page.module.scss` — Minimal layout adjustments if needed

---

## 3. Component Breakdown

### SessionCard

**Path**: `/src/components/qimela/SessionCard/SessionCard.tsx`

**Props**:

```typescript
interface SessionCardProps {
  session: Session;
  qimelaId: string;
  onSaveSuccess?: () => void;
}
```

**Responsibilities**:

- Render session matchup: home/away team names, logos, scheduled date/time
- Two score input fields (one per contender)
- Individual "Guardar" button per session
- Validate: both scores must be integers >= 0 and < 100; button enabled only if both valid
- Check if session starts in < 3 minutes → disable button + show inline message
- Handle `PICKS_DEADLINE_PASSED` API error response
- Success/error toast after save attempt (via `useToast`)
- Client-side logging: mount, input change, save attempt, API response

**Internal State**:

- `homeScore: string` — user input
- `awayScore: string` — user input
- `isSaving: boolean` — mutation pending
- Derived: `isValid` (both scores valid integers 0-99), `isTooClose` (< 3 min), `isDisabled` (isSaving || isTooClose || !isValid)

---

### UpcomingSessions

**Path**: `/src/components/qimela/UpcomingSessions/UpcomingSessions.tsx`

**Props**:

```typescript
interface UpcomingSessionsProps {
  qimelaId: string;
  eventId: string;
}
```

**Responsibilities**:

- Use `useUpcomingSessions` hook (limit=3) to fetch next 3 sessions
- Render loading spinner, error message, or session list of `SessionCard` components
- "Ver todos los partidos" link → navigates to `/qimela/[id]/sessions`
- Client-side logging: session count, navigation

---

### AllSessions Page

**Path**: `/src/app/(app)/qimela/[id]/sessions/page.tsx`

**Responsibilities**:

- Extract `qimelaId` from route params; get `eventId` from `QimelaContext.selectedQimela`
- Use `useUpcomingSessions` with no limit to fetch all sessions for the event
- Render full session list with `SessionCard` components (same styling as dashboard "Próximos partidos")
- Card header with event name + icon + back button/breadcrumb
- Client-side logging: page load, session count

---

## 4. Custom Hooks

### useUpcomingSessions

**Path**: `/src/hooks/useUpcomingSessions.ts`

```typescript
interface UseUpcomingSessionsOptions {
  qimelaId: string;
  eventId: string;
  limit?: number; // Default: 3. Omit for all-sessions page.
}

export function useUpcomingSessions(
  options: UseUpcomingSessionsOptions,
): UseQueryResult<Session[], Error>;
```

- Calls `GET /qimelas/:qimelaId/sessions/upcoming` (or all sessions endpoint)
- **Client-side filter**: removes sessions where `scheduledAt - now < 3 * 60 * 1000`
- Query key: `["upcoming-sessions", qimelaId, eventId, limit]`
- `staleTime: 60_000` (60s — sessions are time-sensitive)
- Enabled only when both `qimelaId` and `eventId` are truthy

**Filtering logic**:

```typescript
const cutoff = Date.now() + 3 * 60 * 1000;
return sessions.filter((s) => new Date(s.scheduledAt).getTime() >= cutoff);
```

---

### useSavePrediction

**Path**: `/src/hooks/useSavePrediction.ts`

```typescript
export interface SavePredictionBody {
  sessionId: string;
  homeScore: number;
  awayScore: number;
}

export function useSavePrediction(qimelaId: string): UseMutationResult<..., ApiError, SavePredictionBody>
```

- Calls `POST /qimelas/:qimelaId/sessions/:sessionId/picks`
- On success: invalidates `["upcoming-sessions", qimelaId, ...]` queries
- Returns error to component so component handles toast display
- Logs mutation attempt, response, and errors

---

## 5. API Calls

### Add to `/src/lib/apiClient.ts` — New `predictionsApi` object

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

### Backend Endpoint Contract

| Method | Path                                           | Purpose                               |
| ------ | ---------------------------------------------- | ------------------------------------- |
| GET    | `/qimelas/:qimelaId/sessions/upcoming`         | Next 3 sessions (cutoff: now + 3 min) |
| GET    | `/qimelas/:qimelaId/sessions`                  | All sessions grouped by phase         |
| POST   | `/qimelas/:qimelaId/sessions/:sessionId/picks` | Save picks for one session            |

**POST picks request body**:

```json
{
  "picks": [
    { "pickCategoryId": "uuid", "value": "2" },
    { "pickCategoryId": "uuid", "value": "1" }
  ]
}
```

**Error codes to handle client-side**:

- `PICKS_DEADLINE_PASSED` (422) — session starts in < 3 min
- `PICKS_SESSION_NOT_OPEN` (422) — session is not SCHEDULED
- Score out of range (400) — value not integer 0-99

---

## 6. State Management

### TanStack Query (data)

- `useUpcomingSessions`: cached by `(qimelaId, eventId, limit)`, 60s staleTime
- `useSavePrediction`: mutation, invalidates sessions cache on success

### Local Component State (SessionCard)

- `homeScore`, `awayScore` — uncontrolled string state
- `isSaving` — derived from mutation state

### Global Context (existing, no new context needed)

- `QimelaContext` — provides `selectedQimela.id` and `selectedQimela.eventId`
- `ToastContext` — provides `toast(message, variant)`
- `AuthContext` — provides current user

---

## 7. Validation Logic

### Score input validation

```typescript
const isValidScore = (value: string): boolean => {
  if (!value) return false;
  if (!/^\d+$/.test(value)) return false;
  const num = parseInt(value, 10);
  return num >= 0 && num < 100;
};

const isValid = isValidScore(homeScore) && isValidScore(awayScore);
```

### Time check (3-minute rule)

```typescript
const isTooClose = (scheduledAt: string): boolean => {
  return new Date(scheduledAt).getTime() - Date.now() < 3 * 60 * 1000;
};
```

### Button disabled conditions

```typescript
const isDisabled = isSaving || isTooClose || !isValid;
```

### Inline messages (no toast — immediate feedback)

- Invalid score → "Los scores deben estar entre 0 y 99" (red, below inputs)
- Too close → "El partido comienza en menos de 3 minutos" (gray, button disabled)
- Saving → button text changes to "Guardando..."

---

## 8. Toast & Notification Strategy

| Event                    | Variant | Message                                                                         |
| ------------------------ | ------- | ------------------------------------------------------------------------------- |
| Save success             | success | "Predicción guardada exitosamente"                                              |
| `PICKS_DEADLINE_PASSED`  | error   | "El partido comienza en menos de 3 minutos. No se puede guardar la predicción." |
| `PICKS_SESSION_NOT_OPEN` | error   | "El partido ya ha comenzado. No se puede guardar la predicción."                |
| Score out of range (API) | error   | "Los scores deben estar entre 0 y 99."                                          |
| Unauthorized (403)       | error   | "No tienes permiso para hacer predicciones en esta qimela."                     |
| Network/generic error    | error   | "No se pudo guardar la predicción. Intenta de nuevo."                           |

Inline messages (not toasts): score validation errors and time warning shown directly below inputs.

---

## 9. Routing Changes

### New route

- **`/src/app/(app)/qimela/[id]/sessions/page.tsx`**
- Dynamic segment `[id]` = qimelaId
- No changes to existing routes

### Navigation link (in UpcomingSessions)

```typescript
<Link href={`/qimela/${qimelaId}/sessions`}>
  Ver todos los partidos <i className="ph ph-arrow-right" />
</Link>
```

---

## 10. Test Plan

### Hook unit tests

**`useUpcomingSessions.test.ts`**

1. Fetches from correct endpoint with qimelaId
2. Applies `limit=3` by default
3. Filters out sessions starting in < 3 minutes (client-side)
4. Returns `Session[]` on success
5. Sets error state on API failure
6. Does not fetch when qimelaId or eventId is missing
7. Uses correct query key

**`useSavePrediction.test.ts`**

1. Calls POST endpoint with correct URL and body
2. Returns pick data on success
3. Handles `PICKS_DEADLINE_PASSED` error
4. Invalidates `upcoming-sessions` queries after success
5. Does not invalidate queries on error

### Component integration tests (React Testing Library)

**`SessionCard.test.tsx`** (15 cases)

1. Renders home team name, away team name, scheduled date
2. Renders two score input fields with placeholders
3. Renders "Guardar" button
4. Button disabled when homeScore is invalid (empty, non-numeric, negative, >= 100)
5. Button disabled when awayScore is invalid
6. Button enabled when both scores are valid (0-99)
7. Shows inline error when either score is invalid
8. Shows inline warning when session starts in < 3 minutes
9. Button disabled when session starts in < 3 minutes
10. Calls mutation with correct body on "Guardar" click
11. Shows "Guardando..." on button during API call
12. Shows success toast on save success
13. Shows `PICKS_DEADLINE_PASSED` error toast on API error
14. Clears score inputs after successful save
15. Input only accepts digit keypresses

**`UpcomingSessions.test.tsx`** (7 cases)

1. Renders loading spinner while fetching
2. Renders error message on fetch failure
3. Renders list of SessionCard components with mock data
4. Passes correct props to each SessionCard
5. "Ver todos los partidos" link has correct href
6. Renders card header with title and icon
7. Shows empty state when no sessions available

**`sessions/page.test.tsx`** (7 cases)

1. Renders heading with event/qimela name
2. Calls hook with no limit (all sessions)
3. Renders SessionCard for each session
4. Shows "No hay partidos disponibles" when empty
5. Loads qimelaId from params
6. Shows loading state while fetching
7. Shows error message on fetch failure

---

## 11. Client-Side Logging

**SessionCard**:

```typescript
console.log("[SessionCard] Rendered", { sessionId, scheduledAt, isTooClose });
console.log("[SessionCard] Score input changed", {
  sessionId,
  homeScore,
  awayScore,
  isValid,
});
console.log("[SessionCard] Attempting to save prediction", {
  sessionId,
  homeScore,
  awayScore,
});
console.log("[SessionCard] Prediction saved", { sessionId, predictionId });
console.error("[SessionCard] Prediction save failed", {
  sessionId,
  status,
  code,
  message,
});
```

**UpcomingSessions**:

```typescript
console.log("[UpcomingSessions] Sessions loaded", {
  qimelaId,
  count: sessions.length,
});
console.error("[UpcomingSessions] Failed to load sessions", {
  qimelaId,
  error,
});
console.log("[UpcomingSessions] Navigating to all sessions", { href });
```

**AllSessions page**:

```typescript
console.log("[AllSessions] Page loaded", {
  qimelaId,
  sessionCount: sessions.length,
});
```

---

## 12. Styling (SCSS modules, design system)

All styling uses SCSS modules (`@use "../../../styles/variables" as *`) to match the existing glassmorphism design:

- **SessionCard container**: `background: $color-surface`, `backdrop-filter: blur(24px)`, `border-radius: $radius-md`, hover lift
- **Score inputs**: 44x44px, `border-radius: $radius-sm`, yellow focus ring (`box-shadow: 0 0 0 4px $color-primary-light`)
- **"Guardar" button**: inline (not full-width), inherits primary gradient (`linear-gradient(180deg, $color-primary 0%, #f5c900 100%)`)
- **"Ver todos" link**: matches `.btn-expand` style (ghost, white bg on hover)
- **Responsive**: flex-column at ≤1024px, reduced padding/sizes at ≤768px

---

## 13. Implementation Phases

### Phase 1 — Types & API Client (1-2h)

1. Create `/src/types/prediction.ts`
2. Extend `/src/lib/apiClient.ts` with `predictionsApi`

### Phase 2 — Hooks (2-3h)

1. Create `useUpcomingSessions.ts` with client-side filtering
2. Create `useSavePrediction.ts` with cache invalidation
3. Write hook unit tests

### Phase 3 — SessionCard Component (3-4h)

1. Create `SessionCard.tsx`, `SessionCard.module.scss`
2. Implement validation, time check, save flow, toasts, logging
3. Write 15 integration tests

### Phase 4 — UpcomingSessions Component (2-3h)

1. Create `UpcomingSessions.tsx`, `UpcomingSessions.module.scss`
2. Integrate hook, render cards, add navigation link
3. Write 7 integration tests

### Phase 5 — AllSessions Page & Dashboard Integration (2-3h)

1. Create `/src/app/(app)/qimela/[id]/sessions/page.tsx`
2. Integrate `UpcomingSessions` into `ParticipantDashboard.tsx`
3. Write page tests

### Phase 6 — Manual Testing & Polish (2-3h)

1. Full flow: select qimela → 3 sessions → enter scores → save → toast
2. Edge cases: < 3 min, network error, invalid scores, empty state
3. Responsive testing (mobile, tablet, desktop)
4. Accessibility (keyboard nav, ARIA labels)

### Phase 7 — Review & Merge (1h)

1. Run all tests; verify coverage ≥ 80% for new code
2. TypeScript + ESLint clean
3. PR with description and test results
