/*
  Warnings:

  - Added the required column `sport_id` to the `sessions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "pick_categories" ADD COLUMN     "is_default" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "sport_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
