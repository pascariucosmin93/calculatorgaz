CREATE TYPE "TariffSource" AS ENUM ('MANUAL', 'INVOICE', 'MIGRATED');

CREATE TABLE "TariffHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "pcs" DOUBLE PRECISION NOT NULL,
    "gasPriceMwh" DOUBLE PRECISION NOT NULL,
    "transportPriceMwh" DOUBLE PRECISION NOT NULL,
    "distributionPriceMwh" DOUBLE PRECISION NOT NULL,
    "cap26PriceMwh" DOUBLE PRECISION NOT NULL,
    "cap6PriceMwh" DOUBLE PRECISION NOT NULL,
    "fixedFee" DOUBLE PRECISION NOT NULL,
    "vatRate" DOUBLE PRECISION NOT NULL,
    "includeVat" BOOLEAN NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "source" "TariffSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TariffHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TariffHistory_userId_validFrom_idx" ON "TariffHistory"("userId", "validFrom");

ALTER TABLE "TariffHistory" ADD CONSTRAINT "TariffHistory_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "TariffHistory" (
  "id", "userId", "city", "pcs", "gasPriceMwh", "transportPriceMwh",
  "distributionPriceMwh", "cap26PriceMwh", "cap6PriceMwh", "fixedFee",
  "vatRate", "includeVat", "validFrom", "source", "createdAt"
)
SELECT
  'migrated_' || "id", "userId", "city", "pcs", "gasPriceMwh", "transportPriceMwh",
  "distributionPriceMwh", "cap26PriceMwh", "cap6PriceMwh", "fixedFee",
  "vatRate", "includeVat", "updatedAt", 'MIGRATED', "updatedAt"
FROM "TariffProfile";
