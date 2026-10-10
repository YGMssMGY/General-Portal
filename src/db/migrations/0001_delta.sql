ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "disabled" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locale" varchar(8) NOT NULL DEFAULT 'en-US';
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "timezone" varchar(64) NOT NULL DEFAULT 'UTC';
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" text;
--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "roleId" uuid;
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "meetingId" uuid;
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "dependsOnId" uuid;
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "recurrence" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_meeting_idx" ON "tasks" ("meetingId");
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "checkInCode" varchar(12);
--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN IF NOT EXISTS "sha256" text;
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "prevHash" text;
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "hash" text;
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "deletedAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "deletedAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "proposal_templates" ADD COLUMN IF NOT EXISTS "deletedAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "deletedAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "deletedAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "message_threads" ADD COLUMN IF NOT EXISTS "deletedAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "subgroups" ADD COLUMN IF NOT EXISTS "deletedAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "link_items" ADD COLUMN IF NOT EXISTS "deletedAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN IF NOT EXISTS "deletedAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "showcase_items" ADD COLUMN IF NOT EXISTS "deletedAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "cooperation_requests" ADD COLUMN IF NOT EXISTS "deletedAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "deletedAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "deletedAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "budget_allocations" ADD COLUMN IF NOT EXISTS "deletedAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "volunteer_slots" ADD COLUMN IF NOT EXISTS "deletedAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "kudos" ADD COLUMN IF NOT EXISTS "deletedAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "annual_event_plans" ADD COLUMN IF NOT EXISTS "deletedAt" timestamp(3);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_meeting_idx" ON "tasks" ("meetingId");
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "memberships" ADD CONSTRAINT "memberships_roleId_roles_id_fk" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
