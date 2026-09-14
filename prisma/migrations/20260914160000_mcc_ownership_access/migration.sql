ALTER TABLE "CustomerAccount"
  ADD COLUMN "mccHasOwnership" BOOLEAN,
  ADD COLUMN "mccOwnershipCheckedAt" TIMESTAMP(3),
  ADD COLUMN "mccOwnershipErrorCode" TEXT;
