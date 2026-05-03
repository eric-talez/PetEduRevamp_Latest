CREATE TABLE IF NOT EXISTS "content_reports" (
"id" serial PRIMARY KEY NOT NULL,
"reporter_id" integer,
"target_type" varchar(30) NOT NULL,
"target_id" integer NOT NULL,
"target_name" varchar(200),
"report_type" varchar(30) DEFAULT 'other' NOT NULL,
"reason" varchar(200) NOT NULL,
"description" text,
"priority" varchar(20) DEFAULT 'medium',
"status" varchar(20) DEFAULT 'pending',
"assigned_to" integer,
"resolved_by" integer,
"resolved_at" timestamp,
"resolution_comment" text,
"metadata" jsonb,
"created_at" timestamp DEFAULT now(),
"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_reports_status_idx" ON "content_reports" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_reports_target_idx" ON "content_reports" ("target_type","target_id");
