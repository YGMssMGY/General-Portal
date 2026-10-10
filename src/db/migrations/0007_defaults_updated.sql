ALTER TABLE "public"."annual_event_plans" ALTER COLUMN "updatedAt" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "public"."budget_allocations" ALTER COLUMN "updatedAt" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "public"."cooperation_requests" ALTER COLUMN "updatedAt" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "public"."events" ALTER COLUMN "updatedAt" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "public"."link_items" ALTER COLUMN "updatedAt" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "public"."meetings" ALTER COLUMN "updatedAt" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "public"."message_threads" ALTER COLUMN "updatedAt" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "public"."proposal_templates" ALTER COLUMN "updatedAt" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "public"."proposals" ALTER COLUMN "updatedAt" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "public"."purchase_requests" ALTER COLUMN "updatedAt" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "public"."showcase_items" ALTER COLUMN "updatedAt" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "public"."subgroups" ALTER COLUMN "updatedAt" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "public"."tasks" ALTER COLUMN "updatedAt" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "public"."users" ALTER COLUMN "updatedAt" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "public"."workspaces" ALTER COLUMN "updatedAt" SET DEFAULT now();
--> statement-breakpoint