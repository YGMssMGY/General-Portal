ALTER TABLE "saved_views" ADD COLUMN IF NOT EXISTS "shareVersion" integer DEFAULT 0 NOT NULL;
