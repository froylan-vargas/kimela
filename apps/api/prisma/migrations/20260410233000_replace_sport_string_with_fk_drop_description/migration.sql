-- Delete existing qimela rows so we can safely add the non-nullable sport_id FK.
-- This is development seed data — re-run the seed after migrating.
DELETE FROM "qimela_rules";
DELETE FROM "qimelas";

-- Drop description column
ALTER TABLE "qimelas" DROP COLUMN IF EXISTS "description";

-- Drop old sport string column
ALTER TABLE "qimelas" DROP COLUMN "sport";

-- Add sport_id FK (non-nullable, safe now that the table is empty)
ALTER TABLE "qimelas" ADD COLUMN "sport_id" TEXT NOT NULL;

ALTER TABLE "qimelas" ADD CONSTRAINT "qimelas_sport_id_fkey"
  FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
