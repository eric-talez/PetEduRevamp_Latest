-- Task #53: notifications/notification_preferences 영구 저장 보강 마이그레이션
-- 0002_notification_preferences.sql 이후 schema.ts 와의 차이를 채움.

-- notifications: action_url, metadata 컬럼 보강
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "action_url" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "metadata" jsonb;--> statement-breakpoint

-- 기존 data(json) 컬럼이 남아 있다면 metadata 로 백필 (멱등성 보장)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='notifications' AND column_name='data'
  ) THEN
    UPDATE "notifications"
    SET "metadata" = "data"::jsonb
    WHERE "metadata" IS NULL AND "data" IS NOT NULL;
  END IF;
END $$;--> statement-breakpoint

-- notifications 인덱스 (schema.ts 의 index 정의와 일치)
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at"
  ON "notifications" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_is_read"
  ON "notifications" ("is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_type"
  ON "notifications" ("type");--> statement-breakpoint

-- notification_preferences: 0002 마이그레이션이 누락된 환경을 대비한 안전망
CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "category" varchar(30) NOT NULL,
  "in_app_enabled" boolean DEFAULT true,
  "push_enabled" boolean DEFAULT true,
  "updated_at" timestamp DEFAULT now()
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "notification_prefs_user_cat_uniq"
  ON "notification_preferences" ("user_id", "category");
