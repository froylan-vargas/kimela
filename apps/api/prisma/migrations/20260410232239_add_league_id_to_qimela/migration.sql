-- AlterTable
ALTER TABLE "qimelas" ADD COLUMN     "league_id" TEXT;

-- AddForeignKey
ALTER TABLE "qimelas" ADD CONSTRAINT "qimelas_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
