-- CreateEnum
CREATE TYPE "OpenQuestionStatus" AS ENUM ('HIDDEN', 'VISIBLE');

-- CreateTable
CREATE TABLE "open_questions" (
    "id" TEXT NOT NULL,
    "prompt" VARCHAR(500) NOT NULL,
    "status" "OpenQuestionStatus" NOT NULL DEFAULT 'HIDDEN',
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "event_id" TEXT NOT NULL,

    CONSTRAINT "open_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "open_question_responses" (
    "id" TEXT NOT NULL,
    "answer" VARCHAR(1000) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "question_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "open_question_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "open_questions_event_id_order_key" ON "open_questions"("event_id", "order");

-- CreateIndex
CREATE INDEX "open_questions_event_id_status_order_idx" ON "open_questions"("event_id", "status", "order");

-- CreateIndex
CREATE UNIQUE INDEX "open_question_responses_question_id_user_id_key" ON "open_question_responses"("question_id", "user_id");

-- CreateIndex
CREATE INDEX "open_question_responses_user_id_idx" ON "open_question_responses"("user_id");

-- AddForeignKey
ALTER TABLE "open_questions" ADD CONSTRAINT "open_questions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_question_responses" ADD CONSTRAINT "open_question_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "open_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_question_responses" ADD CONSTRAINT "open_question_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
