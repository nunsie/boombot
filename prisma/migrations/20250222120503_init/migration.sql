-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketType" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL
);

-- CreateTable
CREATE TABLE "Inventory" (
    "ticketType" TEXT NOT NULL PRIMARY KEY,
    "updatedAt" DATETIME NOT NULL,
    "count" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Tokens" (
    "tokenType" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_ticketType_key" ON "Inventory"("ticketType");

-- CreateIndex
CREATE UNIQUE INDEX "Tokens_tokenType_key" ON "Tokens"("tokenType");
