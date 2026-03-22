CREATE TABLE "interview_events" (
  "id"          TEXT NOT NULL,
  "type"        TEXT NOT NULL,
  "label"       TEXT NOT NULL,
  "timestamp"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "interviewId" TEXT NOT NULL,
  CONSTRAINT "interview_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "interview_events_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
