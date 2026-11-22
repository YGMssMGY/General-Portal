ALTER TABLE "transactions" DROP COLUMN IF EXISTS "amount";
--> statement-breakpoint
ALTER TABLE "budget_allocations" DROP COLUMN IF EXISTS "amount";
--> statement-breakpoint
ALTER TABLE "budget_allocations" DROP COLUMN IF EXISTS "spent";
--> statement-breakpoint
ALTER TABLE "budget_transactions" DROP COLUMN IF EXISTS "amount";
--> statement-breakpoint
ALTER TABLE "purchase_requests" DROP COLUMN IF EXISTS "cost";
