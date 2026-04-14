/*
  Warnings:

  - Added the required column `covered_stages` to the `qimelas` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CoveredStages" AS ENUM ('REGULAR_SEASON', 'PLAYOFFS', 'FULL');

-- AlterTable
ALTER TABLE "qimelas" ADD COLUMN     "covered_stages" "CoveredStages" NOT NULL,
ADD COLUMN     "end_phase_id" TEXT,
ADD COLUMN     "start_phase_id" TEXT;

-- AddForeignKey
ALTER TABLE "qimelas" ADD CONSTRAINT "qimelas_start_phase_id_fkey" FOREIGN KEY ("start_phase_id") REFERENCES "phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qimelas" ADD CONSTRAINT "qimelas_end_phase_id_fkey" FOREIGN KEY ("end_phase_id") REFERENCES "phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
