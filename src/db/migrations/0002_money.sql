DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'amount') THEN
    ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "amountCents" bigint;
    EXECUTE 'UPDATE "transactions" SET "amountCents" = (amount * 100)::bigint WHERE "amountCents" IS NULL';
    ALTER TABLE "transactions" ALTER COLUMN "amountCents" SET NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_allocations' AND column_name = 'amount') THEN
    ALTER TABLE "budget_allocations" ADD COLUMN IF NOT EXISTS "amountCents" bigint;
    EXECUTE 'UPDATE "budget_allocations" SET "amountCents" = (amount * 100)::bigint WHERE "amountCents" IS NULL';
    ALTER TABLE "budget_allocations" ALTER COLUMN "amountCents" SET NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_allocations' AND column_name = 'spent') THEN
    ALTER TABLE "budget_allocations" ADD COLUMN IF NOT EXISTS "spentCents" bigint;
    EXECUTE 'UPDATE "budget_allocations" SET "spentCents" = (spent * 100)::bigint WHERE "spentCents" IS NULL';
    ALTER TABLE "budget_allocations" ALTER COLUMN "spentCents" SET NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_transactions' AND column_name = 'amount') THEN
    ALTER TABLE "budget_transactions" ADD COLUMN IF NOT EXISTS "amountCents" bigint;
    EXECUTE 'UPDATE "budget_transactions" SET "amountCents" = (amount * 100)::bigint WHERE "amountCents" IS NULL';
    ALTER TABLE "budget_transactions" ALTER COLUMN "amountCents" SET NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_requests' AND column_name = 'cost') THEN
    ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "costCents" bigint;
    EXECUTE 'UPDATE "purchase_requests" SET "costCents" = (cost * 100)::bigint WHERE "costCents" IS NULL';
    ALTER TABLE "purchase_requests" ALTER COLUMN "costCents" SET NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
