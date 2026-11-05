-- Aditivă și compatibilă cu versiunea stable anterioară: tabele noi și coloane
-- nullable. TariffProfile și User.address/meterSerial rămân neschimbate.
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "meterSerial" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Location_userId_idx" ON "Location"("userId");

-- Cel mult o locație implicită per utilizator.
CREATE UNIQUE INDEX "Location_userId_default_key" ON "Location"("userId") WHERE "isDefault";

ALTER TABLE "Location" ADD CONSTRAINT "Location_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LocationTariff" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "pcs" DOUBLE PRECISION NOT NULL,
    "gasPriceMwh" DOUBLE PRECISION NOT NULL,
    "transportPriceMwh" DOUBLE PRECISION NOT NULL,
    "distributionPriceMwh" DOUBLE PRECISION NOT NULL,
    "cap26PriceMwh" DOUBLE PRECISION NOT NULL,
    "cap6PriceMwh" DOUBLE PRECISION NOT NULL,
    "fixedFee" DOUBLE PRECISION NOT NULL,
    "vatRate" DOUBLE PRECISION NOT NULL,
    "includeVat" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationTariff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LocationTariff_locationId_key" ON "LocationTariff"("locationId");

ALTER TABLE "LocationTariff" ADD CONSTRAINT "LocationTariff_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Reading" ADD COLUMN "locationId" TEXT;
ALTER TABLE "TariffHistory" ADD COLUMN "locationId" TEXT;

CREATE INDEX "Reading_locationId_readingAt_idx" ON "Reading"("locationId", "readingAt");
CREATE INDEX "TariffHistory_locationId_validFrom_idx" ON "TariffHistory"("locationId", "validFrom");

ALTER TABLE "Reading" ADD CONSTRAINT "Reading_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TariffHistory" ADD CONSTRAINT "TariffHistory_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: fiecare utilizator primește locația implicită "Acasă".
INSERT INTO "Location" ("id", "userId", "name", "address", "meterSerial", "isDefault")
SELECT 'loc_' || "id", "id", 'Acasă', "address", "meterSerial", true FROM "User";

UPDATE "Reading" SET "locationId" = 'loc_' || "userId" WHERE "userId" IS NOT NULL;
UPDATE "TariffHistory" SET "locationId" = 'loc_' || "userId";

INSERT INTO "LocationTariff" (
  "id", "locationId", "city", "pcs", "gasPriceMwh", "transportPriceMwh",
  "distributionPriceMwh", "cap26PriceMwh", "cap6PriceMwh", "fixedFee",
  "vatRate", "includeVat", "updatedAt"
)
SELECT
  'lt_' || "id", 'loc_' || "userId", "city", "pcs", "gasPriceMwh", "transportPriceMwh",
  "distributionPriceMwh", "cap26PriceMwh", "cap6PriceMwh", "fixedFee",
  "vatRate", "includeVat", "updatedAt"
FROM "TariffProfile";
