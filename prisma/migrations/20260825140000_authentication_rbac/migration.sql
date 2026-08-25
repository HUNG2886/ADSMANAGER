-- Normalize the active roles to ADMIN and STAFF.
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role"
USING (CASE WHEN "role"::text IN ('ADMIN', 'SUPER_ADMIN') THEN 'ADMIN'::"Role" ELSE 'STAFF'::"Role" END);
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'STAFF';
DROP TYPE "Role_old";

-- Suspensions and session revocation are enforced on every authenticated request.
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
ALTER TABLE "User"
  ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
UPDATE "User" SET "status" = CASE WHEN "isActive" THEN 'ACTIVE'::"UserStatus" ELSE 'SUSPENDED'::"UserStatus" END;
ALTER TABLE "User" DROP COLUMN "isActive";

-- Optional MCC scoping for STAFF; enforcement is enabled with MCC_SCOPED_ACCESS_ENABLED=true.
CREATE TABLE "UserMCCPermission" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "mccId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserMCCPermission_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UserMCCPermission_userId_idx" ON "UserMCCPermission"("userId");
CREATE INDEX "UserMCCPermission_mccId_idx" ON "UserMCCPermission"("mccId");
CREATE UNIQUE INDEX "UserMCCPermission_userId_mccId_key" ON "UserMCCPermission"("userId", "mccId");
ALTER TABLE "UserMCCPermission" ADD CONSTRAINT "UserMCCPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserMCCPermission" ADD CONSTRAINT "UserMCCPermission_mccId_fkey" FOREIGN KEY ("mccId") REFERENCES "MCC"("id") ON DELETE CASCADE ON UPDATE CASCADE;
