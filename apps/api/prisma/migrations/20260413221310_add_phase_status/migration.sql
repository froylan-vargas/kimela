-- CreateEnum
CREATE TYPE "PhaseStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED');

-- AlterTable
ALTER TABLE "phases" ADD COLUMN     "status" "PhaseStatus" NOT NULL DEFAULT 'UPCOMING';
