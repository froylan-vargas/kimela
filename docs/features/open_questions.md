# Feature: Open questions by event

## Objective

Allow admins to create event-level open questions from the event admin page. Questions are shown to users in every qimela linked to that event. Each user can answer each question only once, and both questions and responses are persisted in the database.

The first implementation should keep questions event-scoped, not qimela-scoped. This avoids duplicated content and makes the "answer just 1 time" rule clear even when the same user belongs to multiple qimelas for the same event.

## Product behavior

### Admin

In `/admin/events/[eventId]`, add an "Preguntas abiertas" section below the existing phases area.

Admin flow:

1. Admin writes a question.
2. Admin saves it.
3. Once saved, the row shows two actions beside the question:
   - `Mostrar`
   - `Ocultar`
4. `Mostrar` publishes the question to users in all qimelas linked to the event.
5. `Ocultar` removes it from the user-facing list without deleting stored answers.

Recommended admin states:

- Draft form: question text input/textarea and `Guardar pregunta`.
- Saved hidden question: status `Oculta`, actions `Mostrar`, optionally `Eliminar` later.
- Saved visible question: status `Visible`, action `Ocultar`.
- Question with answers: can still be hidden, but editing should be restricted or versioned. For the first implementation, do not allow editing after the first response exists.

User-facing admin copy should be Spanish:

- Section title: `Preguntas abiertas`
- Empty state: `Aún no hay preguntas abiertas para este evento.`
- Save button: `Guardar pregunta`
- Status labels: `Visible`, `Oculta`
- Actions: `Mostrar`, `Ocultar`

### User

For any qimela linked to the event, users see visible open questions.

Recommended placement:

- Add a compact "Preguntas" block in the qimela dashboard, near upcoming sessions.
- Also expose the same block from the qimela detail area if the dashboard becomes crowded.

User flow:

1. User opens a qimela whose `eventId` has visible open questions.
2. The UI lists unanswered visible questions first.
3. User writes one answer and submits.
4. After successful submission, the answer becomes read-only.
5. User cannot edit, replace, or submit another answer for the same question.

User copy:

- Section title: `Preguntas`
- Answer input placeholder: `Escribe tu respuesta`
- Submit button: `Responder`
- Submitted state: `Respuesta enviada`
- Already answered state: show the submitted answer read-only.
- Empty state: `No hay preguntas abiertas por ahora.`

## Database design

Recommended Prisma additions:

```prisma
enum OpenQuestionStatus {
  HIDDEN
  VISIBLE
}

model OpenQuestion {
  id        String             @id @default(uuid())
  prompt    String             @db.VarChar(500)
  status    OpenQuestionStatus @default(HIDDEN)
  order     Int
  createdAt DateTime           @default(now()) @map("created_at")
  updatedAt DateTime           @updatedAt @map("updated_at")

  eventId String @map("event_id")
  event   Event  @relation(fields: [eventId], references: [id], onDelete: Cascade)

  responses OpenQuestionResponse[]

  @@unique([eventId, order])
  @@index([eventId, status, order])
  @@map("open_questions")
}

model OpenQuestionResponse {
  id        String   @id @default(uuid())
  answer    String   @db.VarChar(1000)
  createdAt DateTime @default(now()) @map("created_at")

  questionId String       @map("question_id")
  question   OpenQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)

  userId String @map("user_id")
  user   User   @relation(fields: [userId], references: [id])

  @@unique([questionId, userId])
  @@index([userId])
  @@map("open_question_responses")
}
```

Also add relations:

```prisma
model Event {
  openQuestions OpenQuestion[]
}

model User {
  openQuestionResponses OpenQuestionResponse[]
}
```

Notes:

- `OpenQuestion.status` is the persisted source for `Mostrar` / `Ocultar`.
- `@@unique([questionId, userId])` enforces one answer per user per question.
- Do not include `qimelaId` in `OpenQuestionResponse` for the first implementation. The question belongs to the event and the answer is the user's event-level answer.
- If the product later needs per-qimela responses, add `qimelaId` intentionally and change the unique constraint to `[questionId, userId, qimelaId]`.

## Backend design

Keep the current layered structure.

Recommended API module ownership:

- Admin management endpoints belong in `apps/api/src/modules/admin`.
- User answer endpoints belong in `apps/api/src/modules/qimela` because access is through a qimela and must verify the current user can access that qimela.
- Shared persistence can use Prisma directly in focused use cases at first, but if the logic grows, add `OpenQuestionRepository` contracts under the appropriate domain boundary.

### Admin endpoints

All endpoints remain protected by `@Roles(UserRole.ADMIN)` through `AdminController`.

```http
GET /admin/events/:eventId/open-questions
POST /admin/events/:eventId/open-questions
PATCH /admin/events/:eventId/open-questions/:questionId/show
PATCH /admin/events/:eventId/open-questions/:questionId/hide
```

Response shapes should follow the existing `{ data: ... }` pattern.

Create request:

```json
{
  "prompt": "¿Quién será la revelación del torneo?"
}
```

Admin question DTO:

```ts
interface AdminOpenQuestionDto {
  id: string;
  eventId: string;
  prompt: string;
  status: "HIDDEN" | "VISIBLE";
  order: number;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
}
```

Validation:

- `eventId` and `questionId`: `ParseUUIDPipe`.
- `prompt`: trimmed, required, min length 5, max length 500.
- Show/hide must verify the question belongs to the event in the route.
- Create should assign `order` as max existing order for the event + 1.

Recommended use cases:

- `GetOpenQuestionsByEventUseCase`
- `CreateOpenQuestionUseCase`
- `ShowOpenQuestionUseCase`
- `HideOpenQuestionUseCase`

### User endpoints

Expose visible questions through a qimela route:

```http
GET /qimelas/:qimelaId/open-questions
POST /qimelas/:qimelaId/open-questions/:questionId/response
```

User question DTO:

```ts
interface QimelaOpenQuestionDto {
  id: string;
  prompt: string;
  answered: boolean;
  answer: {
    id: string;
    answer: string;
    createdAt: string;
  } | null;
}
```

Submit request:

```json
{
  "answer": "Lamine Yamal"
}
```

Validation and authorization:

- Current user must be creator or subscriber of the qimela, matching existing qimela access rules.
- Qimela must have an `eventId`; otherwise return a domain-style error message like `Esta qimela no tiene un evento asociado`.
- Question must belong to the qimela's event.
- Question must be `VISIBLE` when answering.
- Answer must be trimmed, required, min length 1, max length 1000.
- If a response already exists for `[questionId, userId]`, return `409 Conflict` with Spanish message: `Ya respondiste esta pregunta.`

Recommended use cases:

- `GetQimelaOpenQuestionsUseCase`
- `AnswerOpenQuestionUseCase`

## Frontend design

### Types

Add a dedicated type file:

```ts
// apps/web/src/types/openQuestion.ts
export type OpenQuestionStatus = "HIDDEN" | "VISIBLE";

export interface AdminOpenQuestion {
  id: string;
  eventId: string;
  prompt: string;
  status: OpenQuestionStatus;
  order: number;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QimelaOpenQuestion {
  id: string;
  prompt: string;
  answered: boolean;
  answer: {
    id: string;
    answer: string;
    createdAt: string;
  } | null;
}
```

### API client

Extend `adminApi`:

```ts
getOpenQuestions(eventId: string): Promise<{ data: AdminOpenQuestion[] }>
createOpenQuestion(eventId: string, body: { prompt: string }): Promise<{ data: AdminOpenQuestion }>
showOpenQuestion(eventId: string, questionId: string): Promise<{ data: AdminOpenQuestion }>
hideOpenQuestion(eventId: string, questionId: string): Promise<{ data: AdminOpenQuestion }>
```

Extend `qimelasApi`:

```ts
getOpenQuestions(qimelaId: string): Promise<{ data: QimelaOpenQuestion[] }>
answerOpenQuestion(qimelaId: string, questionId: string, body: { answer: string }): Promise<{ data: QimelaOpenQuestion }>
```

### Hooks

Recommended hooks:

- `useAdminOpenQuestions(eventId)`
- `useCreateOpenQuestion(eventId)`
- `useShowOpenQuestion(eventId)`
- `useHideOpenQuestion(eventId)`
- `useQimelaOpenQuestions(qimelaId)`
- `useAnswerOpenQuestion(qimelaId)`

Query keys:

```ts
["admin", "openQuestions", eventId][("qimela", qimelaId, "openQuestions")];
```

On answer success, update or invalidate `["qimela", qimelaId, "openQuestions"]`.

### Admin UI

Add `OpenQuestionsPanel` under `apps/web/src/components/admin/OpenQuestionsPanel`.

Suggested placement in the event management page:

- Keep phases in the left sidebar.
- Add the open questions section below the phase form/footer inside the sidebar, or as a second block below the sidebar on mobile.
- The selected phase panel should remain focused on sessions and results.

Component responsibilities:

- Load questions for `eventId`.
- Render create form.
- Render saved question list.
- Show `Mostrar` and `Ocultar` actions based on current status.
- Surface errors through the existing toast context.

Responsive behavior:

- On desktop, keep it below phases in the sidebar.
- On smaller screens, stack phases, open questions, and selected phase content vertically.
- Keep buttons beside each saved question when there is room; wrap below the prompt on narrow screens.

### User UI

Add `OpenQuestionsCard` under `apps/web/src/components/qimela/OpenQuestionsCard`.

Recommended behavior:

- Fetch questions by selected/current qimela id.
- Hide the whole block when there are no visible questions.
- For unanswered questions, show textarea and `Responder`.
- For answered questions, show read-only answer and `Respuesta enviada`.
- Disable submit while pending.
- Use existing `toUserMessage` error handling and toast.

## Edge cases

- Hidden questions should not appear in user lists, but existing answers remain stored.
- A user who answered a question in one qimela should see it as answered in another qimela linked to the same event.
- If a user is removed from a qimela after answering, keep the response because it is event-level history.
- If an event is deleted, questions and responses should cascade through `OpenQuestion`.
- If an admin hides a question while a user is answering, the submit endpoint should reject the answer because the question is no longer visible.
- If two submissions race, the database unique constraint should be the final guard and the API should map the duplicate to `409 Conflict`.

## Testing plan

Backend:

- Unit test create/list/show/hide admin use cases.
- Unit test user list filters hidden questions.
- Unit test answer rejects:
  - no qimela access
  - question from another event
  - hidden question
  - duplicate response
- Add Prisma repository or integration coverage for the unique `[questionId, userId]` constraint if repository abstractions are introduced.

Frontend:

- Admin panel renders empty/loading/error states.
- Admin can create a question and then sees `Mostrar` / `Ocultar`.
- User card renders visible unanswered questions.
- User answer submission changes question to read-only answered state.
- Duplicate/failed submissions surface Spanish errors.

Verification commands when implemented:

```bash
pnpm --filter @qimela/api test
pnpm --filter @qimela/web test
pnpm typecheck
```

If Prisma schema changes are implemented:

```bash
pnpm db:generate
pnpm db:migrate
```
