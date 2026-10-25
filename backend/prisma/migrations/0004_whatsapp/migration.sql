-- CreateTable
CREATE TABLE "WhatsappLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL,
    "orderId" TEXT,
    "orderNumber" INTEGER,
    "to" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "error" TEXT NOT NULL DEFAULT '',
    "messageId" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "WhatsappLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsappLog_createdAt_idx" ON "WhatsappLog"("createdAt");

-- CreateIndex
CREATE INDEX "WhatsappLog_orderId_idx" ON "WhatsappLog"("orderId");

