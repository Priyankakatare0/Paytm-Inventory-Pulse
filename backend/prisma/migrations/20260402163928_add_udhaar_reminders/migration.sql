-- AlterTable
ALTER TABLE "UdhaarEntry" ADD COLUMN     "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderIntervalMins" INTEGER NOT NULL DEFAULT 1440,
ADD COLUMN     "reminderLastSentAt" TIMESTAMP(3),
ADD COLUMN     "reminderNextAt" TIMESTAMP(3);
