-- AlterTable
ALTER TABLE "interviews" ADD COLUMN     "aiReportStatus" TEXT NOT NULL DEFAULT 'pending';

-- CreateIndex
CREATE INDEX "interviews_aiReportStatus_idx" ON "interviews"("aiReportStatus");
