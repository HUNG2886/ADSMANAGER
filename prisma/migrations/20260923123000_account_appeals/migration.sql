CREATE TYPE "AppealStatus" AS ENUM (
  'DRAFT',
  'READY_TO_SUBMIT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE "AppealReason" AS ENUM (
  'DISPUTE_DECISION',
  'MADE_CHANGES_TO_COMPLY'
);

CREATE TABLE "AccountAppeal" (
  "id" TEXT NOT NULL,
  "customerAccountId" TEXT NOT NULL,
  "status" "AppealStatus" NOT NULL DEFAULT 'DRAFT',
  "reason" "AppealReason",
  "suspensionReason" TEXT,
  "correctiveActions" TEXT,
  "appealStatement" TEXT,
  "evidenceNotes" TEXT,
  "contactEmail" TEXT,
  "googleCaseId" TEXT,
  "preparedById" TEXT,
  "reviewedById" TEXT,
  "submittedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "lastSubmittedAt" TIMESTAMP(3),
  "outcomeAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountAppeal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountAppeal_customerAccountId_key" ON "AccountAppeal"("customerAccountId");
CREATE INDEX "AccountAppeal_status_updatedAt_idx" ON "AccountAppeal"("status", "updatedAt");
CREATE INDEX "AccountAppeal_lastSubmittedAt_idx" ON "AccountAppeal"("lastSubmittedAt");

ALTER TABLE "AccountAppeal"
  ADD CONSTRAINT "AccountAppeal_customerAccountId_fkey"
  FOREIGN KEY ("customerAccountId") REFERENCES "CustomerAccount"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
