CREATE TABLE IF NOT EXISTS "event_rsvps" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "eventId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "status" text DEFAULT 'going' NOT NULL,
    "createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "polls" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "workspaceId" uuid NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "status" text DEFAULT 'open' NOT NULL,
    "multiple" boolean DEFAULT false NOT NULL,
    "anonymous" boolean DEFAULT false NOT NULL,
    "closesAt" timestamp (3),
    "createdById" uuid NOT NULL,
    "createdAt" timestamp (3) DEFAULT now() NOT NULL,
    "updatedAt" timestamp (3) DEFAULT now() NOT NULL,
    "deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "poll_options" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "pollId" uuid NOT NULL,
    "text" text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "poll_votes" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "pollId" uuid NOT NULL,
    "optionId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goals" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "workspaceId" uuid NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "ownerId" uuid,
    "status" text DEFAULT 'active' NOT NULL,
    "dueDate" timestamp (3),
    "createdAt" timestamp (3) DEFAULT now() NOT NULL,
    "updatedAt" timestamp (3) DEFAULT now() NOT NULL,
    "deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "key_results" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "goalId" uuid NOT NULL,
    "title" text NOT NULL,
    "target" integer NOT NULL,
    "current" integer DEFAULT 0 NOT NULL,
    "unit" text DEFAULT '' NOT NULL,
    "position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "member_dues" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "workspaceId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "title" text NOT NULL,
    "amountCents" bigint NOT NULL,
    "dueDate" timestamp (3),
    "status" text DEFAULT 'unpaid' NOT NULL,
    "paidAt" timestamp (3),
    "createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assets" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "workspaceId" uuid NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "quantity" integer DEFAULT 1 NOT NULL,
    "condition" text DEFAULT 'good' NOT NULL,
    "createdAt" timestamp (3) DEFAULT now() NOT NULL,
    "deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_loans" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "assetId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "borrowedAt" timestamp (3) DEFAULT now() NOT NULL,
    "dueAt" timestamp (3),
    "returnedAt" timestamp (3),
    "status" text DEFAULT 'out' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "decisions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "workspaceId" uuid NOT NULL,
    "title" text NOT NULL,
    "summary" text NOT NULL,
    "entityType" text,
    "entityId" text,
    "decidedById" uuid,
    "decidedAt" timestamp (3) DEFAULT now() NOT NULL,
    "createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_time_entries" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "taskId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "minutes" integer NOT NULL,
    "note" text,
    "date" timestamp (3) DEFAULT now() NOT NULL,
    "createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reactions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "workspaceId" uuid NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    "userId" uuid NOT NULL,
    "emoji" varchar(16) NOT NULL,
    "createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attachment_versions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "attachmentId" uuid NOT NULL,
    "version" integer NOT NULL,
    "storagePath" text NOT NULL,
    "fileSize" integer NOT NULL,
    "sha256" text,
    "createdById" uuid,
    "createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_items" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "meetingId" uuid NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "position" integer DEFAULT 0 NOT NULL,
    "status" text DEFAULT 'open' NOT NULL,
    "createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "link_items" ADD COLUMN IF NOT EXISTS "lastCheckedAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "link_items" ADD COLUMN IF NOT EXISTS "checkStatus" text DEFAULT 'unknown' NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "uiPrefs" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "dependsOnId" uuid;
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "recurrence" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "event_rsvps_uidx" ON "event_rsvps" ("eventId", "userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_rsvps_event_idx" ON "event_rsvps" ("eventId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_rsvps_user_idx" ON "event_rsvps" ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "polls_ws_idx" ON "polls" ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "polls_ws_created_idx" ON "polls" ("workspaceId", "createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "poll_options_poll_idx" ON "poll_options" ("pollId");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "poll_votes_uidx" ON "poll_votes" ("pollId", "optionId", "userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "poll_votes_poll_idx" ON "poll_votes" ("pollId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "poll_votes_user_idx" ON "poll_votes" ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goals_ws_idx" ON "goals" ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goals_ws_created_idx" ON "goals" ("workspaceId", "createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "key_results_goal_idx" ON "key_results" ("goalId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_dues_ws_idx" ON "member_dues" ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_dues_user_idx" ON "member_dues" ("workspaceId", "userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_dues_ws_created_idx" ON "member_dues" ("workspaceId", "createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_ws_idx" ON "assets" ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_loans_asset_idx" ON "asset_loans" ("assetId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_loans_user_idx" ON "asset_loans" ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "decisions_ws_idx" ON "decisions" ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "decisions_ws_created_idx" ON "decisions" ("workspaceId", "createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_time_task_idx" ON "task_time_entries" ("taskId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_time_user_idx" ON "task_time_entries" ("userId");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reactions_uidx" ON "reactions" ("entityType", "entityId", "userId", "emoji");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reactions_entity_idx" ON "reactions" ("entityType", "entityId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attachment_versions_att_idx" ON "attachment_versions" ("attachmentId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_items_meeting_idx" ON "agenda_items" ("meetingId");
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_eventId_events_id_fk" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "polls" ADD CONSTRAINT "polls_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "polls" ADD CONSTRAINT "polls_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_pollId_polls_id_fk" FOREIGN KEY ("pollId") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_pollId_polls_id_fk" FOREIGN KEY ("pollId") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_optionId_poll_options_id_fk" FOREIGN KEY ("optionId") REFERENCES "public"."poll_options"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "goals" ADD CONSTRAINT "goals_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "goals" ADD CONSTRAINT "goals_ownerId_users_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "key_results" ADD CONSTRAINT "key_results_goalId_goals_id_fk" FOREIGN KEY ("goalId") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "member_dues" ADD CONSTRAINT "member_dues_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "member_dues" ADD CONSTRAINT "member_dues_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "assets" ADD CONSTRAINT "assets_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "asset_loans" ADD CONSTRAINT "asset_loans_assetId_assets_id_fk" FOREIGN KEY ("assetId") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "asset_loans" ADD CONSTRAINT "asset_loans_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "decisions" ADD CONSTRAINT "decisions_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "decisions" ADD CONSTRAINT "decisions_decidedById_users_id_fk" FOREIGN KEY ("decidedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "task_time_entries" ADD CONSTRAINT "task_time_entries_taskId_tasks_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "task_time_entries" ADD CONSTRAINT "task_time_entries_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "reactions" ADD CONSTRAINT "reactions_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "reactions" ADD CONSTRAINT "reactions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "attachment_versions" ADD CONSTRAINT "attachment_versions_attachmentId_attachments_id_fk" FOREIGN KEY ("attachmentId") REFERENCES "public"."attachments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "attachment_versions" ADD CONSTRAINT "attachment_versions_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "agenda_items" ADD CONSTRAINT "agenda_items_meetingId_meetings_id_fk" FOREIGN KEY ("meetingId") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
