-- Add slug to sports: backfill from name, then add unique constraint
ALTER TABLE "sports" ADD COLUMN "slug" TEXT;
UPDATE "sports" SET "slug" = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'));
ALTER TABLE "sports" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "sports_slug_key" ON "sports"("slug");

-- Add slug to leagues: backfill from name, then add unique constraint
ALTER TABLE "leagues" ADD COLUMN "slug" TEXT;
UPDATE "leagues" SET "slug" = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'));
ALTER TABLE "leagues" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "leagues_slug_sport_id_key" ON "leagues"("slug", "sport_id");
