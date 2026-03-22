-- Ensure gen_random_uuid() is available on all PostgreSQL instances
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add joinToken to rooms: nullable first, backfill, then set NOT NULL + unique
ALTER TABLE "rooms" ADD COLUMN "joinToken" TEXT;
UPDATE "rooms" SET "joinToken" = gen_random_uuid()::TEXT WHERE "joinToken" IS NULL;
ALTER TABLE "rooms" ALTER COLUMN "joinToken" SET NOT NULL;
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_joinToken_key" UNIQUE ("joinToken");

-- Add shareToken to ai_reports (nullable — only set when owner generates share link)
ALTER TABLE "ai_reports" ADD COLUMN "shareToken" TEXT;
ALTER TABLE "ai_reports" ADD CONSTRAINT "ai_reports_shareToken_key" UNIQUE ("shareToken");
