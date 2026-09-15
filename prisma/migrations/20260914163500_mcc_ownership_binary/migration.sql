UPDATE "CustomerAccount"
SET "mccHasOwnership" = false
WHERE "mccHasOwnership" IS NULL;

ALTER TABLE "CustomerAccount"
  ALTER COLUMN "mccHasOwnership" SET DEFAULT false,
  ALTER COLUMN "mccHasOwnership" SET NOT NULL;
