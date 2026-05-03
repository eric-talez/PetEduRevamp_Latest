CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "actor_id" integer,
  "actor_role" varchar(50),
  "actor_name" varchar(100),
  "action" varchar(100) NOT NULL,
  "target_type" varchar(50),
  "target_id" varchar(100),
  "target_name" varchar(200),
  "payload" jsonb,
  "ip" varchar(64),
  "user_agent" text,
  "request_id" varchar(64),
  "route" varchar(200),
  "status" varchar(20) DEFAULT 'success',
  "error_message" text,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_actor" ON "audit_logs" ("actor_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs" ("action");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_target" ON "audit_logs" ("target_type","target_id");
