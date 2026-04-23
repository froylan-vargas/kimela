-- CreateTable
CREATE TABLE "user_session_points" (
    "id" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "exact_result" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "qimela_id" TEXT NOT NULL,

    CONSTRAINT "user_session_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_qimela_points" (
    "id" TEXT NOT NULL,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "exact_results_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "qimela_id" TEXT NOT NULL,

    CONSTRAINT "user_qimela_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_session_points_qimela_id_user_id_idx" ON "user_session_points"("qimela_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_session_points_user_id_session_id_qimela_id_key" ON "user_session_points"("user_id", "session_id", "qimela_id");

-- CreateIndex
CREATE INDEX "user_qimela_points_qimela_id_total_points_exact_results_cou_idx" ON "user_qimela_points"("qimela_id", "total_points" DESC, "exact_results_count" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_qimela_points_user_id_qimela_id_key" ON "user_qimela_points"("user_id", "qimela_id");

-- AddForeignKey
ALTER TABLE "user_session_points" ADD CONSTRAINT "user_session_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_session_points" ADD CONSTRAINT "user_session_points_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_session_points" ADD CONSTRAINT "user_session_points_qimela_id_fkey" FOREIGN KEY ("qimela_id") REFERENCES "qimelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_qimela_points" ADD CONSTRAINT "user_qimela_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_qimela_points" ADD CONSTRAINT "user_qimela_points_qimela_id_fkey" FOREIGN KEY ("qimela_id") REFERENCES "qimelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
