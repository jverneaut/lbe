/*
  Warnings:

  - You are about to drop the column `shop` on the `ShippingDelayProfile` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShippingDelayProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "delayValue" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ShippingDelayProfile" ("createdAt", "delayValue", "id", "profileId", "updatedAt") SELECT "createdAt", "delayValue", "id", "profileId", "updatedAt" FROM "ShippingDelayProfile";
DROP TABLE "ShippingDelayProfile";
ALTER TABLE "new_ShippingDelayProfile" RENAME TO "ShippingDelayProfile";
CREATE UNIQUE INDEX "ShippingDelayProfile_delayValue_key" ON "ShippingDelayProfile"("delayValue");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
