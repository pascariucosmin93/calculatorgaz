CREATE TYPE "LoginOutcome" AS ENUM ('SUCCESS', 'FAILURE');

CREATE TABLE "LoginEvent" (
    "id" TEXT NOT NULL,
    "outcome" "LoginOutcome" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoginEvent_outcome_createdAt_idx" ON "LoginEvent"("outcome", "createdAt");
