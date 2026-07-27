CREATE TABLE "interview_templates" (
  "id"               TEXT         NOT NULL,
  "name"             TEXT         NOT NULL,
  "description"      TEXT,
  "ownerId"          TEXT         NOT NULL,
  "language"         TEXT         NOT NULL DEFAULT 'javascript',
  "durationMinutes"  INTEGER      NOT NULL DEFAULT 60,
  "problemIds"       TEXT[]       NOT NULL DEFAULT '{}',
  "focusModeEnabled" BOOLEAN      NOT NULL DEFAULT false,
  "rubricWeights"    JSONB,
  "customPrompt"     TEXT,
  "usageCount"       INTEGER      NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "interview_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "interview_templates_ownerId_idx" ON "interview_templates"("ownerId");

ALTER TABLE "interview_templates"
  ADD CONSTRAINT "interview_templates_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "rooms"
  ADD COLUMN IF NOT EXISTS "templateId" TEXT;

ALTER TABLE "rooms"
  ADD CONSTRAINT "rooms_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "interview_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
