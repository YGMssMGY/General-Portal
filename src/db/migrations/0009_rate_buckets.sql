CREATE TABLE IF NOT EXISTS "rate_buckets" (
    "key" text PRIMARY KEY,
    "tokens" integer NOT NULL,
    "updatedAt" timestamp(3) NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_buckets_updated_at_idx" ON "rate_buckets" ("updatedAt");
--> statement-breakpoint
