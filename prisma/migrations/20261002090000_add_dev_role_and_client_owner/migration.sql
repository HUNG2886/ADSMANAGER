ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DEV';

ALTER TABLE "Client" ADD COLUMN "ownerId" TEXT;

UPDATE "Client" AS client
SET "ownerId" = owners."userId"
FROM (
  SELECT DISTINCT ON (assignment."clientId")
    assignment."clientId",
    mcc."userId"
  FROM "ClientAccountAssignment" AS assignment
  INNER JOIN "CustomerAccount" AS account ON account."id" = assignment."customerAccountId"
  INNER JOIN "MCC" AS mcc ON mcc."id" = account."mccId"
  ORDER BY assignment."clientId", assignment."createdAt" ASC
) AS owners
WHERE client."id" = owners."clientId" AND client."ownerId" IS NULL;

CREATE INDEX "Client_ownerId_idx" ON "Client"("ownerId");

ALTER TABLE "Client"
ADD CONSTRAINT "Client_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
