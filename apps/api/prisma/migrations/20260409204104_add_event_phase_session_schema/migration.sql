-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PhaseType" AS ENUM ('REGULAR_SEASON', 'PLAYOFFS', 'OTHER');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "PickCategoryValueType" AS ENUM ('CONTENDER', 'SCALAR');

-- AlterTable
ALTER TABLE "qimelas" ADD COLUMN     "event_id" TEXT;

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "status" "EventStatus" NOT NULL DEFAULT 'UPCOMING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "league_id" TEXT NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phases" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "PhaseType" NOT NULL DEFAULT 'OTHER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "event_id" TEXT NOT NULL,

    CONSTRAINT "phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "phase_id" TEXT NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_contenders" (
    "id" TEXT NOT NULL,
    "role" TEXT,
    "session_id" TEXT NOT NULL,
    "contender_id" TEXT NOT NULL,

    CONSTRAINT "session_contenders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pick_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value_type" "PickCategoryValueType" NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "sport_id" TEXT NOT NULL,

    CONSTRAINT "pick_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_pick_categories" (
    "session_id" TEXT NOT NULL,
    "pick_category_id" TEXT NOT NULL,

    CONSTRAINT "session_pick_categories_pkey" PRIMARY KEY ("session_id","pick_category_id")
);

-- CreateTable
CREATE TABLE "session_results" (
    "id" TEXT NOT NULL,
    "value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "session_id" TEXT NOT NULL,
    "pick_category_id" TEXT NOT NULL,
    "contender_id" TEXT,

    CONSTRAINT "session_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_picks" (
    "id" TEXT NOT NULL,
    "value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "pick_category_id" TEXT NOT NULL,
    "picked_contender_id" TEXT,

    CONSTRAINT "user_picks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "phases_event_id_order_key" ON "phases"("event_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "session_contenders_session_id_contender_id_key" ON "session_contenders"("session_id", "contender_id");

-- CreateIndex
CREATE UNIQUE INDEX "pick_categories_sport_id_name_key" ON "pick_categories"("sport_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "session_results_session_id_pick_category_id_key" ON "session_results"("session_id", "pick_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_picks_user_id_session_id_pick_category_id_key" ON "user_picks"("user_id", "session_id", "pick_category_id");

-- AddForeignKey
ALTER TABLE "qimelas" ADD CONSTRAINT "qimelas_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phases" ADD CONSTRAINT "phases_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_contenders" ADD CONSTRAINT "session_contenders_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_contenders" ADD CONSTRAINT "session_contenders_contender_id_fkey" FOREIGN KEY ("contender_id") REFERENCES "contenders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pick_categories" ADD CONSTRAINT "pick_categories_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_pick_categories" ADD CONSTRAINT "session_pick_categories_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_pick_categories" ADD CONSTRAINT "session_pick_categories_pick_category_id_fkey" FOREIGN KEY ("pick_category_id") REFERENCES "pick_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_results" ADD CONSTRAINT "session_results_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_results" ADD CONSTRAINT "session_results_pick_category_id_fkey" FOREIGN KEY ("pick_category_id") REFERENCES "pick_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_results" ADD CONSTRAINT "session_results_contender_id_fkey" FOREIGN KEY ("contender_id") REFERENCES "contenders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_picks" ADD CONSTRAINT "user_picks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_picks" ADD CONSTRAINT "user_picks_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_picks" ADD CONSTRAINT "user_picks_pick_category_id_fkey" FOREIGN KEY ("pick_category_id") REFERENCES "pick_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_picks" ADD CONSTRAINT "user_picks_picked_contender_id_fkey" FOREIGN KEY ("picked_contender_id") REFERENCES "contenders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
