-- Persist AI analysis share tokens with audit fields
CREATE TABLE IF NOT EXISTS "ai_analysis_share_tokens" (
  "id" SERIAL PRIMARY KEY,
  "token" VARCHAR(128) NOT NULL UNIQUE,
  "analysis_id" INTEGER NOT NULL REFERENCES "ai_analyses"("id"),
  "created_by" INTEGER REFERENCES "users"("id"),
  "expires_at" TIMESTAMP NOT NULL,
  "revoked_at" TIMESTAMP,
  "access_count" INTEGER NOT NULL DEFAULT 0,
  "last_accessed_at" TIMESTAMP,
  "last_accessed_ip" VARCHAR(64),
  "created_at" TIMESTAMP DEFAULT NOW()
);

ALTER TABLE "ai_analysis_share_tokens"
  ADD COLUMN IF NOT EXISTS "access_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ai_analysis_share_tokens"
  ADD COLUMN IF NOT EXISTS "last_accessed_at" TIMESTAMP;
ALTER TABLE "ai_analysis_share_tokens"
  ADD COLUMN IF NOT EXISTS "last_accessed_ip" VARCHAR(64);

CREATE INDEX IF NOT EXISTS "idx_ai_share_tokens_expires"
  ON "ai_analysis_share_tokens" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_ai_share_tokens_revoked"
  ON "ai_analysis_share_tokens" ("revoked_at");
