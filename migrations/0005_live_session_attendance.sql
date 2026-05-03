CREATE TABLE IF NOT EXISTS "live_session_attendance" (
  "id" serial PRIMARY KEY NOT NULL,
  "stream_id" integer NOT NULL,
  "reservation_id" integer,
  "user_id" integer NOT NULL,
  "joined_at" timestamp DEFAULT now(),
  "left_at" timestamp,
  "total_seconds" integer DEFAULT 0,
  "status" varchar(20) DEFAULT 'joined',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "live_session_attendance"
    ADD CONSTRAINT "live_session_attendance_stream_id_live_streams_id_fk"
    FOREIGN KEY ("stream_id") REFERENCES "live_streams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "live_session_attendance"
    ADD CONSTRAINT "live_session_attendance_reservation_id_reservations_id_fk"
    FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "live_session_attendance"
    ADD CONSTRAINT "live_session_attendance_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lsa_stream" ON "live_session_attendance" ("stream_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lsa_user" ON "live_session_attendance" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lsa_reservation" ON "live_session_attendance" ("reservation_id");
