CREATE TABLE IF NOT EXISTS "comments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "workspaceId" uuid NOT NULL,
    "entityType" text NOT NULL,
    "entityId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "body" text NOT NULL,
    "createdAt" timestamp (3) DEFAULT now() NOT NULL,
    "updatedAt" timestamp (3) DEFAULT now() NOT NULL,
    "deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_ws_entity_idx" ON "comments" ("workspaceId", "entityType", "entityId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_user_idx" ON "comments" ("userId");
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "comments" ADD CONSTRAINT "comments_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
