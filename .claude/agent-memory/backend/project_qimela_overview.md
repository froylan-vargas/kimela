---
name: qimela project overview
description: Core architecture, key patterns, and important domain facts for the qimela backend
type: project
---

DDD architecture with modules: admin, qimela, auth, jobs, users. Each module has domain / application / infrastructure / presentation layers.

Prisma v7 with `@prisma/adapter-pg` adapter pattern (PrismaPg in PrismaService constructor).

QimelaStatus enum: ACTIVE, COMPLETED, UPCOMING, CANCELLED, PAUSED.

SessionStatus enum: SCHEDULED, LIVE, COMPLETED, CANCELLED, POSTPONED — `COMPLETED` already exists.

Mock auth user id used in tests (check auth module for specific value).

pgboss v12.15.0 is already wired up via `PgBossModule` / `PgBossService` (shared/queue). The email module is the only current consumer — it uses `boss.send()` and `boss.work()` + `boss.createQueue()` pattern. The `boss.getDb()` method exists on PgBoss v12 and returns an `IDatabase` object, but pg-boss v12 does NOT expose a `sendTransaction` / transactional send API — enqueue and Prisma transaction must be sequenced (enqueue after commit), not wrapped in the same Prisma transaction.

SessionResult model already exists in schema (session_results table): one row per (sessionId, pickCategoryId) with optional contenderId for CONTENDER-type categories and optional `value` for SCALAR-type categories. This is the correct shape for admin results entry — no new table needed.

No UserPoints / leaderboard model exists yet. Feature to plan: save session results + transition session to COMPLETED + enqueue pgboss job to compute user points per qimela.

**Why:** Planning session-results save + points computation job as of 2026-04-22.
**How to apply:** When implementing the results + scoring feature, the SessionResult table is already modeled correctly. The main additions are: UserSessionPoints (per-user-per-session granular), UserQimelaPoints (running total), and the pgboss worker for score computation.
