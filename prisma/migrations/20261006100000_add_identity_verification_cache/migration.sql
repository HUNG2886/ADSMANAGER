ALTER TABLE "CustomerAccount"
ADD COLUMN "verificationStatus" TEXT,
ADD COLUMN "verificationStartDeadline" TEXT,
ADD COLUMN "verificationCompletionDeadline" TEXT,
ADD COLUMN "verificationCheckedAt" TIMESTAMP(3),
ADD COLUMN "verificationErrorCode" TEXT,
ADD COLUMN "verificationErrorMessage" TEXT,
ADD COLUMN "verificationRequestId" TEXT;
