# Plan: Cancel Session Result (Admin Recovery)

## Goal

Allow an admin to cancel a wrongly saved session result. Cancelling a result:
1. Deletes the `session_results` rows for that session
2. Resets the session status from `COMPLETED` → `SCHEDULED`
3. Writes an audit row (who cancelled, when, what the previous result was)
4. Enqueues the same scoring job so points are recomputed from scratch (session gets 0 pts for all users until a correct result is saved)

## Current flow (reference)

```
PUT .../sessions/:id/results
  → SaveSessionResultsUseCase
      → upsert session_results (home + away)
      → session.status = COMPLETED
      → enqueue session.score-picks
          → ScoringWorkerService.processJob()
              → deleteMany user_session_points for session
              → recompute per user
              → upsert user_qimela_points (aggregate)
```

## New cancel flow

```
DELETE .../sessions/:id/results
  → CancelSessionResultsUseCase
      → read current session_results (for audit)
      → transaction:
          → delete session_results for session
          → session.status = SCHEDULED
          → insert session_result_audits row
      → enqueue session.score-picks (same queue, same job)
          → scorer runs with empty results → 0 pts for everyone
          → user_qimela_points recomputed correctly
```

## Prerequisites / assumptions to verify before coding

- `PickScoringService.computePoints()` called with empty `results` array returns `{ points: 0, exactResult: false, correctPick: false }`. If it throws, add a guard at the top of `scoreQimela` to return early and set 0 points explicitly when `results.length === 0`.
- `save-session-results.use-case.ts` already guards `if (session.status === 'COMPLETED')` → `ConflictException`, so after a cancel the admin can save a corrected result normally.

---

## Step 1 — Prisma migration: add audit table

Add to `schema.prisma` (after `SessionResult` model):

```prisma
model SessionResultAudit {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now()) @map("created_at")

  sessionId   String  @map("session_id")
  session     Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  cancelledById String @map("cancelled_by_id")
  cancelledBy   User   @relation(fields: [cancelledById], references: [id])

  previousHomeScore String @map("previous_home_score")
  previousAwayScore String @map("previous_away_score")

  @@map("session_result_audits")
}
```

Also add back-relations:
- `Session`: `resultAudits SessionResultAudit[]`
- `User`: `sessionResultAudits SessionResultAudit[]`

Run: `pnpm prisma migrate dev --name add_session_result_audit`

---

## Step 2 — Backend use case: `CancelSessionResultsUseCase`

File: `apps/api/src/modules/admin/application/use-cases/cancel-session-results.use-case.ts`

```
export interface CancelSessionResultsCommand {
  eventId: string;
  phaseId: string;
  sessionId: string;
  cancelledByUserId: string;   // from JWT subject
}
```

Logic:
1. `findUnique` session — throw `NotFoundException` if missing or not in correct phase/event
2. Throw `ConflictException` if `session.status !== 'COMPLETED'` (nothing to cancel)
3. Read current `session_results` for the session (need home/away values for audit)
4. Transaction:
   - `deleteMany` on `session_results` where `sessionId`
   - `update` session `status = SCHEDULED`
   - `create` `session_result_audits` row with `previousHomeScore`, `previousAwayScore`, `cancelledById`
5. Enqueue `session.score-picks` (same as `SaveSessionResultsUseCase`)

---

## Step 3 — Wire into admin module and controller

**`admin.module.ts`**: add `CancelSessionResultsUseCase` to `providers`.

**`admin.controller.ts`**: add endpoint

```
@Delete('events/:eventId/phases/:phaseId/sessions/:sessionId/results')
@HttpCode(204)
async cancelSessionResults(
  @Param('eventId', ParseUUIDPipe) eventId: string,
  @Param('phaseId', ParseUUIDPipe) phaseId: string,
  @Param('sessionId', ParseUUIDPipe) sessionId: string,
  @Req() req: Request,
): Promise<void>
```

Get `cancelledByUserId` from `req.user.sub` (same pattern as other admin endpoints).

---

## Step 4 — Frontend: apiClient

In `apps/web/src/lib/apiClient.ts`, add to `adminApi`:

```ts
cancelSessionResult(eventId: string, phaseId: string, sessionId: string): Promise<void> {
  return apiFetch<void>(
    `/admin/events/${encodeURIComponent(eventId)}/phases/${encodeURIComponent(phaseId)}/sessions/${encodeURIComponent(sessionId)}/results`,
    { method: 'DELETE' },
  );
}
```

---

## Step 5 — Frontend: SessionResultsEditor UI

File: `apps/web/src/components/admin/SessionResultsEditor/SessionResultsEditor.tsx`

### State additions

```ts
const [cancellingId, setCancellingId] = useState<string | null>(null);
const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null);
```

### Cancel handler

```ts
async function handleCancel(sessionId: string) {
  setCancellingId(sessionId);
  setConfirmingCancelId(null);
  try {
    await adminApi.cancelSessionResult(eventId, phaseId, sessionId);
    await queryClient.invalidateQueries({ queryKey: ['admin', 'sessions', eventId, phaseId] });
    toast('Resultado anulado. Los puntos serán recalculados.', 'success');
  } catch (err) {
    toast(toUserMessage(err), 'error');
  } finally {
    setCancellingId(null);
  }
}
```

### Card footer (COMPLETED state)

Replace the current footer for completed cards with an inline confirmation pattern:

```
if confirmingCancelId === session.id:
  show: "¿Confirmar anulación?" + [Sí, anular] [No]
else:
  show: "Resultado final registrado"  +  [Anular resultado] button
```

- "Anular resultado" button: small, destructive style (red/outlined), only visible when `isCompleted`
- "Sí, anular" triggers `handleCancel(session.id)`
- "No" sets `confirmingCancelId(null)`
- Both buttons and the "Anular resultado" button are disabled when `cancellingId === session.id`

No modal needed — the inline confirm pattern inside the card footer is sufficient and avoids extra complexity.

### SCSS additions (`SessionResultsEditor.module.scss`)

```scss
.cancelButton     // small, red outline, destructive look
.cancelConfirm    // flex row: text + two small buttons
.confirmYes       // red fill
.confirmNo        // neutral
```

---

## Step 6 — Verify scorer handles empty results

Open `PickScoringService.computePoints()` and confirm empty `results` returns all-zero scored output.

If it does **not** handle empty results gracefully:
- Add at the top of `ScoringWorkerService.scoreQimela()`:
  ```ts
  if (results.length === 0) {
    // No results yet — set 0 pts for all users and recompute aggregates
    // (handles the cancel-result recovery path)
    ...
  }
  ```

---

## Rollout order

1. Prisma migration (Step 1)
2. Backend use case + controller (Steps 2–3)
3. Frontend apiClient (Step 4)
4. Frontend UI (Step 5)
5. Verify scorer (Step 6) — can be done in parallel with Step 4

## Out of scope

- Audit log UI (admin can query the DB directly for now)
- Cancelling a result that was never saved (409 returned from API is enough)
- Bulk cancel
