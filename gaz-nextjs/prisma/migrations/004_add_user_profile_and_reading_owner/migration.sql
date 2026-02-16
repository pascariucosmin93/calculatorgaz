-- AlterTable
ALTER TABLE "User"
ADD COLUMN "ownerName" TEXT,
ADD COLUMN "address" TEXT;

-- AlterTable
ALTER TABLE "Reading"
ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "Reading_userId_idx" ON "Reading"("userId");

-- AddForeignKey
ALTER TABLE "Reading"
ADD CONSTRAINT "Reading_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
