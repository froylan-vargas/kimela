-- AlterTable: remove covered_stages column from qimelas
ALTER TABLE "qimelas" DROP COLUMN "covered_stages";

-- DropEnum
DROP TYPE "CoveredStages";
