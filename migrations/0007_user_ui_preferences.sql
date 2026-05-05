-- [Task #109] 사용자별 UI 환경설정 (보호자 본인 알림장 읽음 시각 표시 등)
CREATE TABLE IF NOT EXISTS "user_ui_preferences" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "pref_key" varchar(80) NOT NULL,
  "pref_value" text,
  "updated_at" timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_ui_pref_user_key_uniq" ON "user_ui_preferences" ("user_id", "pref_key");
