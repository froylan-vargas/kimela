-- CreateTable
CREATE TABLE "session_result_audits" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "session_id" TEXT NOT NULL,
    "cancelled_by_id" TEXT NOT NULL,
    "previous_home_score" TEXT NOT NULL,
    "previous_away_score" TEXT NOT NULL,

    CONSTRAINT "session_result_audits_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "session_result_audits" ADD CONSTRAINT "session_result_audits_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_result_audits" ADD CONSTRAINT "session_result_audits_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
