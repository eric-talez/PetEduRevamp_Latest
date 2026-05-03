CREATE INDEX IF NOT EXISTS "idx_courses_created_at" ON "courses" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_created_at" ON "orders" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_course_purchases_created_at" ON "course_purchases" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_messages_created_at" ON "messages" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "notifications" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_is_read" ON "notifications" ("is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_type" ON "notifications" ("type");
