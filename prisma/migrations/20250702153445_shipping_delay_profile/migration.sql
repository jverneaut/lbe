-- CreateTable
CREATE TABLE "ShippingDelayProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "delayValue" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ShippingDelayProfile_shop_delayValue_key" ON "ShippingDelayProfile"("shop", "delayValue");
