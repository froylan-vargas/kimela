# Feature: Create rules for qimelas (persistence logic)

## Definition

- A rules describes how user accumulates points for a specific qimela.

## Notes

- En este momento solo nos vamos a preocupar por reglas para matchup, no para race.
- Las reglas son aplicadas a las qimelas.

## Requirement

- Help me to model the schema entities for matchup qimelas.
- Ver ejemplo para ayudate a modelar el schema.
- Las respuestas al cuestionario de reglas serán parte de la qimela.

### Examples

- En la pantalla de crear qimela, la idea es tener un cuestionario que permita configurar las reglas de la qimela.
- Por ejemplo la regla 'session_winner', con una descripción/pregunta "Cuántos puntos obtendrá el usuario si adivina el ganador del evento?", el resultado es un escalar númerico.
- Otra regla puede ser 'exact_session_result', con una descripción/pregunta "Cuántos puntos obtendrá el usuario si adivina el resultado exacto del evento?", el resultado es un escalar númerico que puede ser 0.

## Implementation plan

- Only schema. Do not implement backend or frontend.

### 1. Schema

Add two models to `apps/api/prisma/schema.prisma`: `Rule` (rule catalog) and `QimelaRule` (rule configured for a specific qimela).

**Why a model instead of an enum:**
A `Rule` model stores the question text alongside the slug, so the questionnaire UI can be driven by data fetched from the DB — no hardcoded strings in the frontend. New rules can be added by inserting a row + seeding, without a schema migration.

```prisma
model Rule {
  id            String        @id @default(uuid())
  slug          String        @unique  // e.g. "session_winner", "exact_session_result"
  question      String                 // UI question shown in the questionnaire
  sessionFormat SessionFormat          // reuses existing enum: MATCHUP | RACE
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  qimelaRules   QimelaRule[]

  @@map("rules")
}

model QimelaRule {
  id       String  @id @default(uuid())
  points   Int     // points awarded when the user correctly applies this rule; 0 is valid

  ruleId   String  @map("rule_id")
  rule     Rule    @relation(fields: [ruleId], references: [id])

  qimelaId String  @map("qimela_id")
  qimela   qimela  @relation(fields: [qimelaId], references: [id], onDelete: Cascade)

  @@unique([qimelaId, ruleId])
  @@map("qimela_rules")
}
```

Add `rules QimelaRule[]` to the existing `qimela` model.

Generate migration: `prisma migrate dev --name add_rule_and_qimela_rule`.

### 2. Seed

Add a `seedRules` function in `apps/api/prisma/seed/rules.ts`. Rules are keyed by `slug` (upsert on `slug`).

Initial MATCHUP rules:

| slug                   | question                                                                       | sessionFormat |
| ---------------------- | ------------------------------------------------------------------------------ | ------------- |
| `session_winner`       | ¿Cuántos puntos obtiene el usuario si adivina el ganador del partido?          | MATCHUP       |
| `exact_session_result` | ¿Cuántos puntos obtiene el usuario si adivina el resultado exacto del partido? | MATCHUP       |

Wire `seedRules` in `apps/api/prisma/seed/index.ts` (no dependencies on other seeds).

### Scope boundary

- RACE rules are out of scope for this iteration — the `sessionFormat` field is included in the model so they can be added later without a migration.
- Rule evaluation (scoring picks against results) is out of scope.
- Editing `QimelaRule.points` after qimela creation is out of scope.
