-- Add a verified Google identity link to existing application users.
ALTER TABLE "User" ADD COLUMN "googleSubject" TEXT;
CREATE UNIQUE INDEX "User_googleSubject_key" ON "User"("googleSubject");

-- Internal CRM records are separate from Google Ads customer accounts.
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "Client" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "company" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "website" TEXT,
  "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientAccountAssignment" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "customerAccountId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientAccountAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountNote" (
  "id" TEXT NOT NULL,
  "customerAccountId" TEXT NOT NULL,
  "authorId" TEXT,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Client_name_idx" ON "Client"("name");
CREATE INDEX "Client_email_idx" ON "Client"("email");
CREATE INDEX "Client_status_idx" ON "Client"("status");
CREATE UNIQUE INDEX "ClientAccountAssignment_customerAccountId_key" ON "ClientAccountAssignment"("customerAccountId");
CREATE INDEX "ClientAccountAssignment_clientId_idx" ON "ClientAccountAssignment"("clientId");
CREATE INDEX "AccountNote_customerAccountId_createdAt_idx" ON "AccountNote"("customerAccountId", "createdAt");
CREATE INDEX "AccountNote_authorId_idx" ON "AccountNote"("authorId");

ALTER TABLE "ClientAccountAssignment"
  ADD CONSTRAINT "ClientAccountAssignment_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientAccountAssignment"
  ADD CONSTRAINT "ClientAccountAssignment_customerAccountId_fkey"
  FOREIGN KEY ("customerAccountId") REFERENCES "CustomerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountNote"
  ADD CONSTRAINT "AccountNote_customerAccountId_fkey"
  FOREIGN KEY ("customerAccountId") REFERENCES "CustomerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountNote"
  ADD CONSTRAINT "AccountNote_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
