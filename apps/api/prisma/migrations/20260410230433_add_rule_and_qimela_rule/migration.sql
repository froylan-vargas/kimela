-- CreateTable
CREATE TABLE "rules" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "session_format" "SessionFormat" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qimela_rules" (
    "id" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "rule_id" TEXT NOT NULL,
    "qimela_id" TEXT NOT NULL,

    CONSTRAINT "qimela_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rules_slug_key" ON "rules"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "qimela_rules_qimela_id_rule_id_key" ON "qimela_rules"("qimela_id", "rule_id");

-- AddForeignKey
ALTER TABLE "qimela_rules" ADD CONSTRAINT "qimela_rules_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qimela_rules" ADD CONSTRAINT "qimela_rules_qimela_id_fkey" FOREIGN KEY ("qimela_id") REFERENCES "qimelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
