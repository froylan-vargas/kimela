-- CreateEnum
CREATE TYPE "SessionFormat" AS ENUM ('MATCHUP', 'RACE');

-- AlterTable
ALTER TABLE "sports" ADD COLUMN     "session_format" "SessionFormat" NOT NULL DEFAULT 'MATCHUP';
