-- Add new columns to problems table (all additive, no renames)
ALTER TABLE "problems"
  ADD COLUMN IF NOT EXISTS "companies"     TEXT[]   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "estimatedTime" INTEGER,
  ADD COLUMN IF NOT EXISTS "isPublic"      BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "usageCount"    INTEGER  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Index for the new filterable columns
CREATE INDEX IF NOT EXISTS "problems_difficulty_topic_idx" ON "problems"("difficulty", "topic");

-- Tag model
CREATE TABLE IF NOT EXISTS "tags" (
  "id"   TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "tags_name_key" ON "tags"("name");

-- Many-to-many join table between problems and tags
CREATE TABLE IF NOT EXISTS "_ProblemToTag" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "_ProblemToTag_AB_unique" ON "_ProblemToTag"("A", "B");
CREATE INDEX IF NOT EXISTS "_ProblemToTag_B_index" ON "_ProblemToTag"("B");
ALTER TABLE "_ProblemToTag"
  ADD CONSTRAINT "_ProblemToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "_ProblemToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
