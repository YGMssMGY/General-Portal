CREATE TABLE IF NOT EXISTS "invitations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "workspaceId" uuid NOT NULL,
    "email" text NOT NULL,
    "roleName" text DEFAULT 'member' NOT NULL,
    "tokenHash" text NOT NULL,
    "invitedById" uuid,
    "expiresAt" timestamp (3),
    "acceptedAt" timestamp (3),
    "revokedAt" timestamp (3),
    "createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invitations_token_uidx" ON "invitations" ("tokenHash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invitations_ws_idx" ON "invitations" ("workspaceId");
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "invitations" ADD CONSTRAINT "invitations_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invitedById_users_id_fk" FOREIGN KEY ("invitedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
