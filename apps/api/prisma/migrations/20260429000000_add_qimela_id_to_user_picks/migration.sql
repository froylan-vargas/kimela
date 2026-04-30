-- Existing picks cannot be tied to a specific qimela, so clear them before adding the NOT NULL column.
DELETE FROM "user_picks";

-- The unique constraint was created as an index by Prisma, not a named constraint.
DROP INDEX "user_picks_user_id_session_id_pick_category_id_key";

-- Add qimela_id column (use a temporary default to satisfy NOT NULL, then drop it).
ALTER TABLE "user_picks" ADD COLUMN "qimela_id" TEXT NOT NULL DEFAULT '';
ALTER TABLE "user_picks" ALTER COLUMN "qimela_id" DROP DEFAULT;

-- Add foreign key to qimelas with cascade delete.
ALTER TABLE "user_picks" ADD CONSTRAINT "user_picks_qimela_id_fkey"
  FOREIGN KEY ("qimela_id") REFERENCES "qimelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add new unique constraint including qimela_id.
ALTER TABLE "user_picks" ADD CONSTRAINT "user_picks_user_id_session_id_pick_category_id_qimela_id_key"
  UNIQUE ("user_id", "session_id", "pick_category_id", "qimela_id");
