-- CreateTable
CREATE TABLE "qimela_labels" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "color" VARCHAR(7) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "qimela_id" TEXT NOT NULL,

    CONSTRAINT "qimela_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_labels" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscription_id" TEXT NOT NULL,
    "label_id" TEXT NOT NULL,

    CONSTRAINT "subscription_labels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_labels_subscription_id_label_id_key" ON "subscription_labels"("subscription_id", "label_id");

-- AddForeignKey
ALTER TABLE "qimela_labels" ADD CONSTRAINT "qimela_labels_qimela_id_fkey" FOREIGN KEY ("qimela_id") REFERENCES "qimelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_labels" ADD CONSTRAINT "subscription_labels_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_labels" ADD CONSTRAINT "subscription_labels_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "qimela_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
