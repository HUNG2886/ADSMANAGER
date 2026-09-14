-- Keep legacy contact fields intact and add the rental account used by the CRM.
ALTER TABLE "Client" ADD COLUMN "rentalAccount" TEXT;
