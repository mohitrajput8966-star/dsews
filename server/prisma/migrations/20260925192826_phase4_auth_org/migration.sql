/*
  Warnings:

  - Added the required column `updatedAt` to the `Location` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN "phone" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "address" TEXT,
    "contactPerson" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Location_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Location" ("address", "createdAt", "id", "name", "orgId", "type") SELECT "address", "createdAt", "id", "name", "orgId", "type" FROM "Location";
DROP TABLE "Location";
ALTER TABLE "new_Location" RENAME TO "Location";
CREATE INDEX "Location_orgId_idx" ON "Location"("orgId");
CREATE TABLE "new_Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "orgType" TEXT NOT NULL,
    "primaryContactName" TEXT,
    "primaryContactEmail" TEXT,
    "primaryContactPhone" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "orgSetupComplete" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Organization" ("createdAt", "currency", "id", "isDemo", "name", "orgType", "primaryContactEmail", "primaryContactName", "updatedAt") SELECT "createdAt", "currency", "id", "isDemo", "name", "orgType", "primaryContactEmail", "primaryContactName", "updatedAt" FROM "Organization";
DROP TABLE "Organization";
ALTER TABLE "new_Organization" RENAME TO "Organization";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
