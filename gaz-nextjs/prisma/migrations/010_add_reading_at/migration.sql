-- Preserve the original submission timestamp for legacy readings, while giving
-- new readings an explicit business date that can be used for monthly reports.
ALTER TABLE "Reading" ADD COLUMN "readingAt" TIMESTAMP(3);

UPDATE "Reading"
SET "readingAt" = "createdAt"
WHERE "readingAt" IS NULL;

ALTER TABLE "Reading"
  ALTER COLUMN "readingAt" SET NOT NULL,
  ALTER COLUMN "readingAt" SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Reading_userId_readingAt_idx" ON "Reading"("userId", "readingAt");
