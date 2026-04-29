# Entity Persistance Logic

## Thinking Process

I need a plan to implement the schema for event, phase and sessions, just shcema don't think in api yet.

Also I need your help beyond the definitions, I want you to think and resolve the way real sessions final results will be stored in the database, just think in the relations, not the api or ui yet.

Remember that this app is not only for soccer, it will also work for f1, so for instance I was thinking Session to have a Results schema relation, but this relation will be different for each sport, for example in soccer a session will have 2 results (home and away team), but in f1 a session will have for instance 3 results (pole position, fastest lap, second, third, last place), so I need a schema that can handle this.

In your analysis also think in how user peeks will be stored, for instance in soccer a user can pick the result of a match, but in f1 a user can pick who will be the winner, second, third, last place, fast lap, first abandon etc.

---

## Implementation plan

### 1. Entity relationship decisions

#### 1.1 The sport-agnostic result/pick problem — core design decision

The fundamental challenge is that "result" and "pick" have different shapes per sport:

- Soccer: 2 contenders, result = integer score per side, pick = predicted score or winner
- F1: N contenders, result = ranked position per driver across named slots (pole, P1, P2, fastest lap, last, DNF...), pick = predicted contender per named slot

Three classical approaches were evaluated:

**Option A — Wide sparse table**: Add optional columns for every sport variant. Rejected: every new sport requires a schema migration, most columns are NULL for most sports, and the table becomes unmaintainable.

**Option B — Joined inheritance**: A base `SessionResult` table with child tables `SoccerResult`, `F1Result`, etc. Rejected: requires sport-specific joins in every query, violates the sport-agnostic constraint, and doesn't solve the pick side symmetrically.

**Option C — EAV (Entity-Attribute-Value) with typed configuration**: A `PickCategory` table defines named slots per sport (e.g. "pole", "fastest_lap", "score_home"), and both `SessionResult` and `UserPick` store one row per (session, contender, category) tuple. Chosen because:

- No sport-specific tables or columns
- New sports/categories are data changes, not schema changes
- Results and picks are symmetric — scoring a pool is a straightforward JOIN
- Rows are individually indexable on `(session_id, category_id)` and `(session_id, user_id)`
- The "category" acts as the semantic label that ties a result row to a pick row for comparison

#### 1.2 PickCategory scope and reuse

`PickCategory` records are defined at the **Sport level**, not per-session. This means "pole" is defined once for F1, not duplicated across 23 races.

Required categories (`PickCategory.isRequired = true`) are sport-level constants — they apply to every session of that sport unconditionally and cannot be suppressed or overridden on a per-session basis.

`SessionPickCategory` is **append-only**: it exists solely to attach optional, session-specific categories to a particular session (e.g. a knockout-phase soccer match adds "extra_time"). It never removes or suppresses a required category.

#### 1.3 SessionContender — the participation join table

Both soccer and F1 require knowing which contenders are in a session. A `SessionContender` join table makes this explicit and queryable:

- Soccer: exactly 2 rows (home, away), distinguished by a `role` string ("home", "away")
- F1: 20 rows, all with role "driver" or null

The `role` field is a nullable `String`, not an enum, to stay sport-agnostic. It carries sport-specific semantics as data.

#### 1.4 SessionResult — what gets stored

One row per **(session, contender, pick_category)**. The `value` column is a `String` that holds the result for that slot:

- Soccer "score_home": value = "2"
- Soccer "score_away": value = "1"
- F1 "pole_position": value = `<contender_id of the pole sitter>` — or the contender_id column IS the answer

Wait — there are two distinct shapes even within F1:

- Categories like "winner", "pole*position", "fastest_lap" answer "which contender?" — the result \_is* a contender
- Categories like "dnf_count" answer a scalar — the result is a number

For the contender-as-answer categories, the result row's `contenderId` IS the result (the driver who achieved that slot). For scalar categories, `value` carries the data. Both patterns are accommodated by having both `contenderId` (nullable FK) and `value` (nullable String) on the result row, with the constraint that at least one must be set.

#### 1.5 UserPick — symmetric with SessionResult

One row per **(session, user, pick_category)**. Mirrors the result row structure:

- `pickedContenderId`: nullable FK — the contender the user predicts for a slot-type category
- `value`: nullable String — predicted scalar for value-type categories

Scoring logic is then: for each pick, find the matching result row on `(sessionId, pickCategoryId)`, compare `pickedContenderId` to result `contenderId` (or `value` to result `value`), award points per category's `points` configuration.

#### 1.6 Event and Phase — the time-bounded competition layer

- `Event` is a time-bounded instance of a `League` (e.g. "Liga MX Clausura 2026"). It has `startsAt`/`endsAt` and a `status` enum.
- `Phase` groups sessions within an event with an explicit `order` integer for sequencing (Group Stage = 1, Knockout = 2, etc.).
- `Session` belongs to a `Phase` and holds the scheduled time (`scheduledAt`) plus a `status` for lifecycle management.

The `qimela` model (the pool itself) links to an `Event` — a pool is played against a specific event instance, not the permanent league.

---

### 2. Prisma model blocks

Add the following models and enums to `schema.prisma` after the existing `ContenderLeague` model.

```prisma
// ─── Event / Phase / Session ──────────────────────────────────────────────────

enum EventStatus {
  UPCOMING
  ACTIVE
  COMPLETED
  CANCELLED
}

enum PhaseType {
  REGULAR_SEASON,
  PLAYOFFS
}

enum SessionStatus {
  SCHEDULED
  LIVE
  COMPLETED
  CANCELLED
  POSTPONED
}

model Event {
  id          String      @id @default(uuid())
  name        String
  startsAt    DateTime    @map("starts_at")
  endsAt      DateTime?   @map("ends_at")
  status      EventStatus @default(UPCOMING)
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  leagueId    String      @map("league_id")
  league      League      @relation(fields: [leagueId], references: [id])

  phases      Phase[]
  qimelas     qimela[]

  @@map("events")
}

model Phase {
  id          String    @id @default(uuid())
  name        String
  order       Int
  type        PhaseType @default(OTHER)
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  eventId     String    @map("event_id")
  event       Event     @relation(fields: [eventId], references: [id], onDelete: Cascade)

  sessions    Session[]

  @@unique([eventId, order])
  @@map("phases")
}

model Session {
  id           String        @id @default(uuid())
  name         String
  scheduledAt  DateTime      @map("scheduled_at")
  status       SessionStatus @default(SCHEDULED)
  createdAt    DateTime      @default(now()) @map("created_at")
  updatedAt    DateTime      @updatedAt @map("updated_at")

  phaseId      String        @map("phase_id")
  phase        Phase         @relation(fields: [phaseId], references: [id], onDelete: Cascade)

  contenders         SessionContender[]
  results            SessionResult[]
  sessionCategories  SessionPickCategory[]
  picks              UserPick[]

  @@map("sessions")
}

// ─── Session Contender participation ─────────────────────────────────────────

model SessionContender {
  id           String    @id @default(uuid())
  role         String?   // sport-specific: "home", "away", "driver", null — stored as data, not enum

  sessionId    String    @map("session_id")
  session      Session   @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  contenderId  String    @map("contender_id")
  contender    Contender @relation(fields: [contenderId], references: [id])

  @@unique([sessionId, contenderId])
  @@map("session_contenders")
}

// ─── Pick Categories (sport-level slot definitions) ──────────────────────────

enum PickCategoryValueType {
  CONTENDER   // result/pick is expressed as a contender FK
  SCALAR      // result/pick is expressed as a plain string/number value
}

model PickCategory {
  id            String               @id @default(uuid())
  name          String               // e.g. "winner", "fastest_lap", "score_home", "pole_position"
  label         String               // human-readable: "Race Winner", "Fastest Lap"
  valueType     PickCategoryValueType @map("value_type")
  points        Int                  @default(1) // base points awarded for a correct pick in this category
  createdAt     DateTime             @default(now()) @map("created_at")
  updatedAt     DateTime             @updatedAt @map("updated_at")

  sportId       String               @map("sport_id")
  sport         Sport                @relation(fields: [sportId], references: [id])

  sessionCategories  SessionPickCategory[]
  results            SessionResult[]
  picks              UserPick[]

  @@unique([sportId, name])
  @@map("pick_categories")
}

// ─── Per-session optional categories (append-only — required categories are sport-level) ─

model SessionPickCategory {
  sessionId       String       @map("session_id")
  session         Session      @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  pickCategoryId  String       @map("pick_category_id")
  pickCategory    PickCategory @relation(fields: [pickCategoryId], references: [id])

  @@id([sessionId, pickCategoryId])
  @@map("session_pick_categories")
}

// ─── Session Results (actual outcomes, sport-agnostic) ────────────────────────

model SessionResult {
  id              String       @id @default(uuid())
  value           String?      // used when pickCategory.valueType = SCALAR (e.g. "2" for a score)
  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")

  sessionId       String       @map("session_id")
  session         Session      @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  pickCategoryId  String       @map("pick_category_id")
  pickCategory    PickCategory @relation(fields: [pickCategoryId], references: [id])

  // The contender who achieved this result slot (used when valueType = CONTENDER)
  // For SCALAR categories this is null; for CONTENDER categories this IS the result
  contenderId     String?      @map("contender_id")
  contender       Contender?   @relation(fields: [contenderId], references: [id])

  @@unique([sessionId, pickCategoryId])
  @@map("session_results")
}

// ─── User Picks ───────────────────────────────────────────────────────────────

model UserPick {
  id                  String       @id @default(uuid())
  value               String?      // used when pickCategory.valueType = SCALAR
  createdAt           DateTime     @default(now()) @map("created_at")
  updatedAt           DateTime     @updatedAt @map("updated_at")

  userId              String       @map("user_id")
  user                User         @relation(fields: [userId], references: [id])

  sessionId           String       @map("session_id")
  session             Session      @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  pickCategoryId      String       @map("pick_category_id")
  pickCategory        PickCategory @relation(fields: [pickCategoryId], references: [id])

  // The contender the user predicts for this slot (used when valueType = CONTENDER)
  pickedContenderId   String?      @map("picked_contender_id")
  pickedContender     Contender?   @relation("PickedContender", fields: [pickedContenderId], references: [id])

  @@unique([userId, sessionId, pickCategoryId])
  @@map("user_picks")
}
```

The following **back-relations** must also be added to existing models to satisfy Prisma's bidirectional relation requirement. Add these fields to the models listed:

```prisma
// Add to model League:
events  Event[]

// Add to model Sport:
pickCategories  PickCategory[]

// Add to model Contender:
sessionParticipations  SessionContender[]
sessionResults         SessionResult[]
pickedInPicks          UserPick[]         @relation("PickedContender")

// Add to model User:
picks  UserPick[]

// Add to model qimela:
eventId  String?  @map("event_id")
event    Event?   @relation(fields: [eventId], references: [id])
```

---

### 4. Scope notes

- Don't do any api change yet, just schema and migartions.
- The `qimela.sport` string field already in the schema should be deprecated in favor of the `qimela → Event → League → Sport` traversal once event data is backfilled.
- Point weighting per category (the `points` field on `PickCategory`) is a base weight. A scoring engine can multiply or modify it based on qimela-specific rules — that configuration layer is not part of this schema design.
- Deadlines for pick submission (lock time before a session starts) are enforced at the application layer using `Session.scheduledAt`, not as a separate schema field.
