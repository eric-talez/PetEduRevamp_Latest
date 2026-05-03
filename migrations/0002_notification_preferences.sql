-- 알림 카테고리 컬럼 추가
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "category" varchar(30);--> statement-breakpoint

-- 알림 수신 설정 테이블
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
