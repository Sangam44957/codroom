-- Room: dashboard list query (ORDER BY createdAt DESC WHERE createdById = ?)
CREATE INDEX IF NOT EXISTS "rooms_createdById_createdAt_idx"
  ON "rooms"("createdById", "createdAt" DESC);

-- Interview: analytics completed-count filter (WHERE status IN (...))
CREATE INDEX IF NOT EXISTS "interviews_status_idx"
  ON "interviews"("status");

-- CodeSnapshot: playback + paginated fetch (WHERE interviewId = ? ORDER BY timestamp ASC)
CREATE INDEX IF NOT EXISTS "code_snapshots_interviewId_timestamp_idx"
  ON "code_snapshots"("interviewId", "timestamp" ASC);

-- InterviewEvent: paginated fetch (WHERE interviewId = ? ORDER BY timestamp ASC)
CREATE INDEX IF NOT EXISTS "interview_events_interviewId_timestamp_idx"
  ON "interview_events"("interviewId", "timestamp" ASC);

-- InterviewEvent: analytics type filter (WHERE interviewId = ? AND type = ?)
CREATE INDEX IF NOT EXISTS "interview_events_interviewId_type_idx"
  ON "interview_events"("interviewId", "type");
