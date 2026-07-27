-- AlterTable
ALTER TABLE "interview_templates" ADD COLUMN     "defaultPipelineId" TEXT;

-- AddForeignKey
ALTER TABLE "interview_templates" ADD CONSTRAINT "interview_templates_defaultPipelineId_fkey" FOREIGN KEY ("defaultPipelineId") REFERENCES "hiring_pipelines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
