CREATE TABLE "InvoiceUpload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceUpload_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvoiceUpload_userId_fileHash_key" ON "InvoiceUpload"("userId", "fileHash");
CREATE INDEX "InvoiceUpload_userId_idx" ON "InvoiceUpload"("userId");

ALTER TABLE "InvoiceUpload" ADD CONSTRAINT "InvoiceUpload_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
