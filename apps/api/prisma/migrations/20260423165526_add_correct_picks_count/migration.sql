-- AlterTable
ALTER TABLE "user_qimela_points" ADD COLUMN     "correct_picks_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "user_session_points" ADD COLUMN     "correct_pick" BOOLEAN NOT NULL DEFAULT false;
