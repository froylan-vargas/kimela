# Data to support an event

## Definitions

- Sports: qimela pools can be of multiple events e.g. soccer, f1, tennis, etc.
- Leagues: Leagues are not events, they are a group of contenders that will compete in an event e.g. Premier League, La Liga, Liga MX, Champions League, the World Cup will have its own league of international contenders, F1 has its own league of drivers.
- Contenders: Contenders are the participants of an event, they are previously registered in a league and can be piolots, teams, players, etc.

## claude-plan

### Entity relationship decisions

| Entity    | Relationship          | Notes                                                                                         |
| --------- | --------------------- | --------------------------------------------------------------------------------------------- |
| Sport     | one-to-many → League  | A sport groups many leagues (e.g. Soccer → La Liga, Premier League)                           |
| League    | many-to-one → Sport   | Each league belongs to exactly one sport                                                      |
| Contender | many-to-many ↔ League | Via explicit join table `ContenderLeague`; allows Real Madrid in La Liga AND Champions League |

The original schema used a plain `leagueId` FK on `Contender`, which would break the multi-league use case. The join table approach is the correct model.

The `qimela` model currently stores `sport` as a plain `String`. That field is intentionally left alone for now — linking it to the new `Sport` model is a separate migration concern and should be addressed when the qimela feature is extended.

---

### Prisma model definitions

Add the following blocks to `/Users/fvg/Source/qimela/apps/api/prisma/schema.prisma`, after the existing models:

```prisma
model Sport {
  id        String   @id @default(uuid())
  name      String   @unique
  imgUrl    String?  @map("img_url")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  leagues   League[]

  @@map("sports")
}

model League {
  id        String   @id @default(uuid())
  name      String
  imgUrl    String?  @map("img_url")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  sportId    String             @map("sport_id")
  sport      Sport              @relation(fields: [sportId], references: [id])
  contenders ContenderLeague[]

  @@unique([name, sportId])
  @@map("leagues")
}

model Contender {
  id        String   @id @default(uuid())
  name      String
  imgUrl    String?  @map("img_url")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  leagues   ContenderLeague[]

  @@map("contenders")
}

model ContenderLeague {
  contenderId String    @map("contender_id")
  contender   Contender @relation(fields: [contenderId], references: [id], onDelete: Cascade)

  leagueId    String    @map("league_id")
  league      League    @relation(fields: [leagueId], references: [id], onDelete: Cascade)

  joinedAt    DateTime  @default(now()) @map("joined_at")

  @@id([contenderId, leagueId])
  @@map("contender_leagues")
}
```

Design notes:

- `imgUrl` is nullable (`String?`) on all three entities — images may not be available at creation time.
- `League` has a composite unique constraint on `(name, sportId)` so the same league name can exist across different sports without collision.
- `ContenderLeague` uses a composite PK `(contenderId, leagueId)` — no surrogate id needed on a pure join table.
- `onDelete: Cascade` on the join table means removing a contender or a league also cleans up its join rows automatically.
- All column names follow the existing `snake_case` mapping convention (`@map`) established in the schema.

---

### Migration steps

1. Add the four model blocks above to `schema.prisma`.
2. Generate and review the migration:
   ```bash
   pnpm --filter api prisma migrate dev --name add_sports_leagues_contenders
   ```
3. Prisma will create four new tables: `sports`, `leagues`, `contenders`, `contender_leagues`. No existing tables are modified.
4. After the migration, regenerate the Prisma client:
   ```bash
   pnpm --filter api prisma generate
   ```
5. Verify with:
   ```bash
   pnpm --filter api prisma studio
   ```

No destructive changes are involved — this migration only adds new tables.
