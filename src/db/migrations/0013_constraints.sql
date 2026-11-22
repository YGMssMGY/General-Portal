DELETE FROM "attendance" a
USING (
    SELECT id, row_number() OVER (
        PARTITION BY "workspaceId", "userId", "meetingId"
        ORDER BY "createdAt" ASC, id ASC
    ) AS rn
    FROM "attendance"
    WHERE "meetingId" IS NOT NULL
) d
WHERE a.id = d.id AND d.rn > 1;
--> statement-breakpoint
DELETE FROM "attendance" a
USING (
    SELECT id, row_number() OVER (
        PARTITION BY "workspaceId", "userId", "eventId"
        ORDER BY "createdAt" ASC, id ASC
    ) AS rn
    FROM "attendance"
    WHERE "eventId" IS NOT NULL
) d
WHERE a.id = d.id AND d.rn > 1;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_ws_user_meeting_uidx" ON "attendance" ("workspaceId", "userId", "meetingId") WHERE "meetingId" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_ws_user_event_uidx" ON "attendance" ("workspaceId", "userId", "eventId") WHERE "eventId" IS NOT NULL;
--> statement-breakpoint
UPDATE "invitations" SET "expiresAt" = "createdAt" + INTERVAL '7 days' WHERE "expiresAt" IS NULL;
--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "expiresAt" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "expiresAt" SET NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS "comments_ws_entity_idx";
--> statement-breakpoint
CREATE INDEX "comments_ws_entity_idx" ON "comments" ("workspaceId", "entityType", "entityId", "createdAt" DESC, id DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_ws_user_created_idx" ON "notifications" ("workspaceId", "userId", "createdAt", id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_deleted_idx" ON "tasks" ("workspaceId", "deletedAt") WHERE "deletedAt" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_active_idx" ON "tasks" ("workspaceId", "createdAt") WHERE "deletedAt" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_deleted_idx" ON "events" ("workspaceId", "deletedAt") WHERE "deletedAt" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_active_idx" ON "events" ("workspaceId", "startDate") WHERE "deletedAt" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proposals_deleted_idx" ON "proposals" ("workspaceId", "deletedAt") WHERE "deletedAt" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_threads_deleted_idx" ON "message_threads" ("workspaceId", "deletedAt") WHERE "deletedAt" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_deleted_idx" ON "meetings" ("workspaceId", "deletedAt") WHERE "deletedAt" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subgroups_deleted_idx" ON "subgroups" ("workspaceId", "deletedAt") WHERE "deletedAt" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "link_items_deleted_idx" ON "link_items" ("workspaceId", "deletedAt") WHERE "deletedAt" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attachments_deleted_idx" ON "attachments" ("workspaceId", "deletedAt") WHERE "deletedAt" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "showcase_items_deleted_idx" ON "showcase_items" ("workspaceId", "deletedAt") WHERE "deletedAt" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cooperation_requests_deleted_idx" ON "cooperation_requests" ("workspaceId", "deletedAt") WHERE "deletedAt" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_requests_deleted_idx" ON "purchase_requests" ("workspaceId", "deletedAt") WHERE "deletedAt" IS NOT NULL;
