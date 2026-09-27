-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "orgType" TEXT NOT NULL,
    "primaryContactName" TEXT,
    "primaryContactEmail" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OrgSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "serviceLevelZ" REAL NOT NULL DEFAULT 1.65,
    "criticalDaysThreshold" REAL NOT NULL DEFAULT 4,
    "reviewPeriodDays" REAL NOT NULL DEFAULT 14,
    "overstockCoverageMultiplier" REAL NOT NULL DEFAULT 3,
    "defaultLeadTimeDays" REAL NOT NULL DEFAULT 7,
    "minOrderQuantityDefault" REAL NOT NULL DEFAULT 10,
    "abcACutoffPct" REAL NOT NULL DEFAULT 70,
    "abcBCutoffPct" REAL NOT NULL DEFAULT 90,
    "fsnFastMovingDays" REAL NOT NULL DEFAULT 30,
    "fsnNonMovingDays" REAL NOT NULL DEFAULT 90,
    "expiryWindowsDays" TEXT NOT NULL DEFAULT '[30,60,90]',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrgSettings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Location_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "locationId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "User_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "avgLeadTimeDays" REAL NOT NULL DEFAULT 7,
    "onTimeDeliveryPct" REAL NOT NULL DEFAULT 90,
    "reliabilityScore" REAL NOT NULL DEFAULT 80,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Supplier_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Drug" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "drugCode" TEXT NOT NULL,
    "genericName" TEXT NOT NULL,
    "brandName" TEXT,
    "strength" TEXT NOT NULL,
    "dosageForm" TEXT NOT NULL,
    "therapeuticCategory" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "unitCost" REAL NOT NULL,
    "criticality" TEXT NOT NULL DEFAULT 'ESSENTIAL',
    "abcCategory" TEXT,
    "fsnCategory" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT,
    CONSTRAINT "Drug_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "supplierId" TEXT,
    "currentStock" REAL NOT NULL DEFAULT 0,
    "minStockLevel" REAL NOT NULL DEFAULT 0,
    "reorderLevel" REAL NOT NULL DEFAULT 0,
    "maxStockLevel" REAL NOT NULL DEFAULT 0,
    "leadTimeDays" REAL NOT NULL DEFAULT 7,
    "safetyStockOverride" REAL,
    "lastPurchaseDate" DATETIME,
    "lastPurchaseQty" REAL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT,
    CONSTRAINT "InventoryItem_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryItem_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "Drug" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiryDate" DATETIME NOT NULL,
    "quantity" REAL NOT NULL,
    "unitCost" REAL NOT NULL,
    "receivedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Batch_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Batch_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "Drug" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Batch_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsumptionHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "quantityConsumed" REAL NOT NULL,
    CONSTRAINT "ConsumptionHistory_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConsumptionHistory_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "Drug" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConsumptionHistory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "supplierId" TEXT,
    "recommendedQty" REAL NOT NULL,
    "requestedQty" REAL NOT NULL,
    "unitCost" REAL NOT NULL,
    "estimatedCost" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "expectedDeliveryDate" DATETIME,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseRequest_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PurchaseRequest_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "Drug" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PurchaseRequest_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PurchaseRequest_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PurchaseRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "performedBy" TEXT,
    "notes" TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "Drug" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "riskLevel" TEXT,
    "message" TEXT NOT NULL,
    "reasonSummary" TEXT NOT NULL,
    "riskScore" REAL,
    "daysRemaining" REAL,
    "projectedStockoutDate" DATETIME,
    "recommendedAction" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alert_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Alert_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "Drug" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Alert_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ForecastResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "forecastedDailyDemand" REAL NOT NULL,
    "avg7Day" REAL NOT NULL,
    "avg30Day" REAL NOT NULL,
    "avg90Day" REAL NOT NULL,
    "trendPctChange" REAL NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ForecastResult_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ForecastResult_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "Drug" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ForecastResult_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changesJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OrgSettings_orgId_key" ON "OrgSettings"("orgId");

-- CreateIndex
CREATE INDEX "Location_orgId_idx" ON "Location"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_orgId_idx" ON "User"("orgId");

-- CreateIndex
CREATE INDEX "Supplier_orgId_idx" ON "Supplier"("orgId");

-- CreateIndex
CREATE INDEX "Drug_orgId_idx" ON "Drug"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Drug_orgId_drugCode_key" ON "Drug"("orgId", "drugCode");

-- CreateIndex
CREATE INDEX "InventoryItem_orgId_idx" ON "InventoryItem"("orgId");

-- CreateIndex
CREATE INDEX "InventoryItem_locationId_idx" ON "InventoryItem"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_drugId_locationId_key" ON "InventoryItem"("drugId", "locationId");

-- CreateIndex
CREATE INDEX "Batch_orgId_idx" ON "Batch"("orgId");

-- CreateIndex
CREATE INDEX "Batch_drugId_locationId_idx" ON "Batch"("drugId", "locationId");

-- CreateIndex
CREATE INDEX "Batch_expiryDate_idx" ON "Batch"("expiryDate");

-- CreateIndex
CREATE INDEX "ConsumptionHistory_orgId_idx" ON "ConsumptionHistory"("orgId");

-- CreateIndex
CREATE INDEX "ConsumptionHistory_drugId_locationId_date_idx" ON "ConsumptionHistory"("drugId", "locationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ConsumptionHistory_drugId_locationId_date_key" ON "ConsumptionHistory"("drugId", "locationId", "date");

-- CreateIndex
CREATE INDEX "PurchaseRequest_orgId_idx" ON "PurchaseRequest"("orgId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_status_idx" ON "PurchaseRequest"("status");

-- CreateIndex
CREATE INDEX "StockMovement_orgId_idx" ON "StockMovement"("orgId");

-- CreateIndex
CREATE INDEX "StockMovement_drugId_locationId_idx" ON "StockMovement"("drugId", "locationId");

-- CreateIndex
CREATE INDEX "Alert_orgId_idx" ON "Alert"("orgId");

-- CreateIndex
CREATE INDEX "Alert_type_idx" ON "Alert"("type");

-- CreateIndex
CREATE INDEX "Alert_isResolved_idx" ON "Alert"("isResolved");

-- CreateIndex
CREATE INDEX "ForecastResult_orgId_idx" ON "ForecastResult"("orgId");

-- CreateIndex
CREATE INDEX "ForecastResult_drugId_locationId_idx" ON "ForecastResult"("drugId", "locationId");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_idx" ON "AuditLog"("orgId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
