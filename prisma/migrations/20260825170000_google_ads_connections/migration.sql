-- Store OAuth connection lifecycle without deleting previously synced data.
CREATE TYPE "GoogleConnectionStatus" AS ENUM ('CONNECTED', 'REAUTH_REQUIRED', 'DISCONNECTED');

ALTER TABLE "GoogleConnection"
  ALTER COLUMN "refreshTokenEncrypted" DROP NOT NULL,
  ADD COLUMN "status" "GoogleConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
  ADD COLUMN "lastRefreshedAt" TIMESTAMP(3),
  ADD COLUMN "lastSyncAt" TIMESTAMP(3),
  ADD COLUMN "lastError" TEXT,
  ADD COLUMN "disconnectedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "GoogleConnection_userId_googleEmail_key" ON "GoogleConnection"("userId", "googleEmail");
CREATE INDEX "GoogleConnection_status_idx" ON "GoogleConnection"("status");

-- Persist the actual Google Ads hierarchy and the manager used for API calls.
ALTER TABLE "MCC"
  ADD COLUMN "parentCustomerId" TEXT,
  ADD COLUMN "loginCustomerId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "manager" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "level" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "testAccount" BOOLEAN NOT NULL DEFAULT false;

UPDATE "MCC" SET "loginCustomerId" = "customerId" WHERE "loginCustomerId" = '';
DROP INDEX "MCC_userId_customerId_key";
CREATE UNIQUE INDEX "MCC_connectionId_customerId_key" ON "MCC"("connectionId", "customerId");

ALTER TABLE "CustomerAccount"
  ADD COLUMN "parentCustomerId" TEXT,
  ADD COLUMN "loginCustomerId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "manager" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "level" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "testAccount" BOOLEAN NOT NULL DEFAULT false;

UPDATE "CustomerAccount" account
SET "loginCustomerId" = mcc."customerId"
FROM "MCC" mcc
WHERE account."mccId" = mcc."id" AND account."loginCustomerId" = '';

ALTER TABLE "Campaign" ADD COLUMN "budgetId" TEXT;
