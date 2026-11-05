CREATE TABLE "TariffProfile" (
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
    "includeVat" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TariffProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TariffProfile_userId_key" ON "TariffProfile"("userId");

ALTER TABLE "TariffProfile" ADD CONSTRAINT "TariffProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
