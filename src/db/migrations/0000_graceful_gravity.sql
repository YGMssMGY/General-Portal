CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname, conrelid::regclass AS tbl FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.tbl, r.conname);
  END LOOP;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'providerAccountId') THEN
    EXECUTE 'DROP TABLE "public"."accounts" CASCADE';
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'sessionToken') THEN
    EXECUTE 'DROP TABLE "public"."sessions" CASCADE';
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'verification_tokens' AND column_name = 'identifier') THEN
    EXECUTE 'DROP TABLE "public"."verification_tokens" CASCADE';
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_feed' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."activity_feed" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'activity_feed', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_feed' AND column_name = 'userId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."activity_feed" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'activity_feed', 'userId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_feed' AND column_name = 'workspaceId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."activity_feed" ALTER COLUMN "workspaceId" TYPE uuid USING "workspaceId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'activity_feed', 'workspaceId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'annual_event_plans' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."annual_event_plans" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'annual_event_plans', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'annual_event_plans' AND column_name = 'workspaceId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."annual_event_plans" ALTER COLUMN "workspaceId" TYPE uuid USING "workspaceId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'annual_event_plans', 'workspaceId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attachments' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."attachments" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'attachments', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attachments' AND column_name = 'uploadedById' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."attachments" ALTER COLUMN "uploadedById" TYPE uuid USING "uploadedById"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'attachments', 'uploadedById', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attachments' AND column_name = 'workspaceId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."attachments" ALTER COLUMN "workspaceId" TYPE uuid USING "workspaceId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'attachments', 'workspaceId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."audit_logs" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'audit_logs', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'userId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."audit_logs" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'audit_logs', 'userId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'workspaceId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."audit_logs" ALTER COLUMN "workspaceId" TYPE uuid USING "workspaceId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'audit_logs', 'workspaceId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'budget_allocations' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."budget_allocations" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'budget_allocations', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'budget_allocations' AND column_name = 'workspaceId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."budget_allocations" ALTER COLUMN "workspaceId" TYPE uuid USING "workspaceId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'budget_allocations', 'workspaceId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'budget_transactions' AND column_name = 'allocationId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."budget_transactions" ALTER COLUMN "allocationId" TYPE uuid USING "allocationId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'budget_transactions', 'allocationId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'budget_transactions' AND column_name = 'decidedById' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."budget_transactions" ALTER COLUMN "decidedById" TYPE uuid USING "decidedById"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'budget_transactions', 'decidedById', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'budget_transactions' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."budget_transactions" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'budget_transactions', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cooperation_requests' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."cooperation_requests" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'cooperation_requests', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cooperation_requests' AND column_name = 'reviewedById' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."cooperation_requests" ALTER COLUMN "reviewedById" TYPE uuid USING "reviewedById"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'cooperation_requests', 'reviewedById', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cooperation_requests' AND column_name = 'submittedById' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."cooperation_requests" ALTER COLUMN "submittedById" TYPE uuid USING "submittedById"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'cooperation_requests', 'submittedById', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cooperation_requests' AND column_name = 'workspaceId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."cooperation_requests" ALTER COLUMN "workspaceId" TYPE uuid USING "workspaceId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'cooperation_requests', 'workspaceId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'annualPlanId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."events" ALTER COLUMN "annualPlanId" TYPE uuid USING "annualPlanId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'events', 'annualPlanId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'approvedById' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."events" ALTER COLUMN "approvedById" TYPE uuid USING "approvedById"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'events', 'approvedById', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'createdById' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."events" ALTER COLUMN "createdById" TYPE uuid USING "createdById"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'events', 'createdById', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."events" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'events', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'workspaceId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."events" ALTER COLUMN "workspaceId" TYPE uuid USING "workspaceId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'events', 'workspaceId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'historical_members' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."historical_members" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'historical_members', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'historical_members' AND column_name = 'workspaceId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."historical_members" ALTER COLUMN "workspaceId" TYPE uuid USING "workspaceId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'historical_members', 'workspaceId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'kudos' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."kudos" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'kudos', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'kudos' AND column_name = 'receiverId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."kudos" ALTER COLUMN "receiverId" TYPE uuid USING "receiverId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'kudos', 'receiverId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'kudos' AND column_name = 'senderId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."kudos" ALTER COLUMN "senderId" TYPE uuid USING "senderId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'kudos', 'senderId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'kudos' AND column_name = 'workspaceId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."kudos" ALTER COLUMN "workspaceId" TYPE uuid USING "workspaceId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'kudos', 'workspaceId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'link_items' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."link_items" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'link_items', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'link_items' AND column_name = 'uploadedById' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."link_items" ALTER COLUMN "uploadedById" TYPE uuid USING "uploadedById"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'link_items', 'uploadedById', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'link_items' AND column_name = 'workspaceId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."link_items" ALTER COLUMN "workspaceId" TYPE uuid USING "workspaceId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'link_items', 'workspaceId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meeting_rsvps' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."meeting_rsvps" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'meeting_rsvps', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meeting_rsvps' AND column_name = 'meetingId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."meeting_rsvps" ALTER COLUMN "meetingId" TYPE uuid USING "meetingId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'meeting_rsvps', 'meetingId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meeting_rsvps' AND column_name = 'userId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."meeting_rsvps" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'meeting_rsvps', 'userId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meetings' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."meetings" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'meetings', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meetings' AND column_name = 'workspaceId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."meetings" ALTER COLUMN "workspaceId" TYPE uuid USING "workspaceId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'meetings', 'workspaceId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'memberships' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."memberships" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'memberships', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'memberships' AND column_name = 'userId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."memberships" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'memberships', 'userId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'memberships' AND column_name = 'workspaceId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."memberships" ALTER COLUMN "workspaceId" TYPE uuid USING "workspaceId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'memberships', 'workspaceId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'message_reads' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."message_reads" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'message_reads', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'message_reads' AND column_name = 'messageId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."message_reads" ALTER COLUMN "messageId" TYPE uuid USING "messageId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'message_reads', 'messageId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'message_reads' AND column_name = 'userId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."message_reads" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'message_reads', 'userId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'message_threads' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."message_threads" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'message_threads', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'message_threads' AND column_name = 'subgroupId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."message_threads" ALTER COLUMN "subgroupId" TYPE uuid USING "subgroupId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'message_threads', 'subgroupId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'message_threads' AND column_name = 'workspaceId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."message_threads" ALTER COLUMN "workspaceId" TYPE uuid USING "workspaceId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'message_threads', 'workspaceId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."messages" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'messages', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'senderId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."messages" ALTER COLUMN "senderId" TYPE uuid USING "senderId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'messages', 'senderId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'threadId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."messages" ALTER COLUMN "threadId" TYPE uuid USING "threadId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'messages', 'threadId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."notifications" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'notifications', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'userId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."notifications" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'notifications', 'userId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'workspaceId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."notifications" ALTER COLUMN "workspaceId" TYPE uuid USING "workspaceId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'notifications', 'workspaceId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposal_templates' AND column_name = 'createdById' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."proposal_templates" ALTER COLUMN "createdById" TYPE uuid USING "createdById"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'proposal_templates', 'createdById', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposal_templates' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."proposal_templates" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'proposal_templates', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposal_templates' AND column_name = 'workspaceId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."proposal_templates" ALTER COLUMN "workspaceId" TYPE uuid USING "workspaceId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'proposal_templates', 'workspaceId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'createdById' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."proposals" ALTER COLUMN "createdById" TYPE uuid USING "createdById"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'proposals', 'createdById', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."proposals" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'proposals', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'workspaceId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."proposals" ALTER COLUMN "workspaceId" TYPE uuid USING "workspaceId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'proposals', 'workspaceId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_requests' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."purchase_requests" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'purchase_requests', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_requests' AND column_name = 'reviewedById' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."purchase_requests" ALTER COLUMN "reviewedById" TYPE uuid USING "reviewedById"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'purchase_requests', 'reviewedById', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_requests' AND column_name = 'submittedById' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."purchase_requests" ALTER COLUMN "submittedById" TYPE uuid USING "submittedById"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'purchase_requests', 'submittedById', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_requests' AND column_name = 'workspaceId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."purchase_requests" ALTER COLUMN "workspaceId" TYPE uuid USING "workspaceId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'purchase_requests', 'workspaceId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'showcase_items' AND column_name = 'createdById' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."showcase_items" ALTER COLUMN "createdById" TYPE uuid USING "createdById"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'showcase_items', 'createdById', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'showcase_items' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."showcase_items" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'showcase_items', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'showcase_items' AND column_name = 'workspaceId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."showcase_items" ALTER COLUMN "workspaceId" TYPE uuid USING "workspaceId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'showcase_items', 'workspaceId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sub_tasks' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."sub_tasks" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'sub_tasks', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sub_tasks' AND column_name = 'taskId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."sub_tasks" ALTER COLUMN "taskId" TYPE uuid USING "taskId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'sub_tasks', 'taskId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subgroup_memberships' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."subgroup_memberships" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'subgroup_memberships', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subgroup_memberships' AND column_name = 'subgroupId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."subgroup_memberships" ALTER COLUMN "subgroupId" TYPE uuid USING "subgroupId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'subgroup_memberships', 'subgroupId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subgroup_memberships' AND column_name = 'userId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."subgroup_memberships" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'subgroup_memberships', 'userId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subgroups' AND column_name = 'createdById' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."subgroups" ALTER COLUMN "createdById" TYPE uuid USING "createdById"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'subgroups', 'createdById', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subgroups' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."subgroups" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'subgroups', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subgroups' AND column_name = 'workspaceId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."subgroups" ALTER COLUMN "workspaceId" TYPE uuid USING "workspaceId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'subgroups', 'workspaceId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'task_comments' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."task_comments" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'task_comments', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'task_comments' AND column_name = 'taskId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."task_comments" ALTER COLUMN "taskId" TYPE uuid USING "taskId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'task_comments', 'taskId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'task_comments' AND column_name = 'userId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."task_comments" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'task_comments', 'userId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'assigneeId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."tasks" ALTER COLUMN "assigneeId" TYPE uuid USING "assigneeId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'tasks', 'assigneeId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'createdById' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."tasks" ALTER COLUMN "createdById" TYPE uuid USING "createdById"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'tasks', 'createdById', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."tasks" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'tasks', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'subgroupId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."tasks" ALTER COLUMN "subgroupId" TYPE uuid USING "subgroupId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'tasks', 'subgroupId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'workspaceId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."tasks" ALTER COLUMN "workspaceId" TYPE uuid USING "workspaceId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'tasks', 'workspaceId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'createdById' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."transactions" ALTER COLUMN "createdById" TYPE uuid USING "createdById"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'transactions', 'createdById', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."transactions" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'transactions', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'workspaceId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."transactions" ALTER COLUMN "workspaceId" TYPE uuid USING "workspaceId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'transactions', 'workspaceId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."users" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'users', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'volunteer_signups' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."volunteer_signups" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'volunteer_signups', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'volunteer_signups' AND column_name = 'slotId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."volunteer_signups" ALTER COLUMN "slotId" TYPE uuid USING "slotId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'volunteer_signups', 'slotId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'volunteer_signups' AND column_name = 'userId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."volunteer_signups" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'volunteer_signups', 'userId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'volunteer_slots' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."volunteer_slots" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'volunteer_slots', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'volunteer_slots' AND column_name = 'workspaceId' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."volunteer_slots" ALTER COLUMN "workspaceId" TYPE uuid USING "workspaceId"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'volunteer_slots', 'workspaceId', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'id' AND data_type = 'text') THEN
    BEGIN
      EXECUTE 'ALTER TABLE "public"."workspaces" ALTER COLUMN "id" TYPE uuid USING "id"::uuid';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'legacy conversion skipped for %.%: %', 'workspaces', 'id', SQLERRM;
    END;
  END IF;
END $$;
--> statement-breakpoint

--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."ApprovalStatus" AS ENUM('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."BudgetStatus" AS ENUM('active', 'spent', 'reconciled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."EventStatus" AS ENUM('draft', 'published', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."MeetingStatus" AS ENUM('scheduled', 'ongoing', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."ProposalStatus" AS ENUM('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."PurchaseRequestStatus" AS ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected', 'fulfilled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."Role" AS ENUM('admin', 'officer', 'member');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."TaskStatus" AS ENUM('todo', 'in_progress', 'done');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."TransactionType" AS ENUM('income', 'expense');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_feed" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"userId" uuid,
	"action" text NOT NULL,
	"entityType" text NOT NULL,
	"entityId" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "annual_event_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"name" text NOT NULL,
	"academicYear" text NOT NULL,
	"description" text,
	"isActive" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"name" text NOT NULL,
	"tokenHash" text NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expiresAt" timestamp (3),
	"lastUsedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "api_tokens_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"workflowId" uuid,
	"entityType" text NOT NULL,
	"entityId" text NOT NULL,
	"stageIndex" integer DEFAULT 0 NOT NULL,
	"approverId" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"comment" text,
	"dueAt" timestamp (3),
	"decidedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"entityType" text NOT NULL,
	"entityId" text NOT NULL,
	"fileName" text NOT NULL,
	"fileSize" integer NOT NULL,
	"mimeType" text NOT NULL,
	"storagePath" text NOT NULL,
	"sha256" text,
	"uploadedById" uuid,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"meetingId" uuid,
	"eventId" uuid,
	"userId" uuid NOT NULL,
	"status" text DEFAULT 'present' NOT NULL,
	"checkedInAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"userId" uuid,
	"action" text NOT NULL,
	"entityType" text NOT NULL,
	"entityId" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ipAddress" text,
	"prevHash" text,
	"hash" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"email" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_pending" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"state" text NOT NULL,
	"nonce" text,
	"codeVerifier" text,
	"portal" text NOT NULL,
	"redirectUri" text NOT NULL,
	"email" text,
	"resource" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"expiresAt" timestamp (3) NOT NULL,
	CONSTRAINT "auth_pending_state_unique" UNIQUE("state")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "budget_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"category" text NOT NULL,
	"amountCents" bigint NOT NULL,
	"spentCents" bigint DEFAULT 0 NOT NULL,
	"fiscalYear" integer NOT NULL,
	"status" "BudgetStatus" DEFAULT 'active' NOT NULL,
	"description" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "budget_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"allocationId" uuid NOT NULL,
	"amountCents" bigint NOT NULL,
	"type" "TransactionType" NOT NULL,
	"description" text,
	"decidedById" uuid,
	"receiptUrl" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cooperation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"clubName" text NOT NULL,
	"contactName" text NOT NULL,
	"contactEmail" text NOT NULL,
	"eventTitle" text NOT NULL,
	"description" text NOT NULL,
	"proposedDate" timestamp (3),
	"resourcesNeeded" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"submittedById" uuid NOT NULL,
	"reviewedById" uuid,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "custom_field_defs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"entityType" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"fieldType" text NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"codeHash" text NOT NULL,
	"purpose" text NOT NULL,
	"portal" text NOT NULL,
	"expiresAt" timestamp (3) NOT NULL,
	"consumedAt" timestamp (3),
	"attempts" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"startDate" timestamp (3) NOT NULL,
	"endDate" timestamp (3),
	"location" text,
	"isPublic" boolean DEFAULT false NOT NULL,
	"status" "EventStatus" DEFAULT 'draft' NOT NULL,
	"approvalStatus" "ApprovalStatus" DEFAULT 'pending' NOT NULL,
	"approvedById" uuid,
	"approvedAt" timestamp (3),
	"reviewComment" text,
	"teamsMessageId" text,
	"annualPlanId" uuid,
	"recurrence" text,
	"createdById" uuid NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "historical_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"councilType" text DEFAULT 'student_council' NOT NULL,
	"academicYear" text NOT NULL,
	"startDate" timestamp (3),
	"endDate" timestamp (3),
	"notes" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kudos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"senderId" uuid NOT NULL,
	"receiverId" uuid NOT NULL,
	"message" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "link_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"category" text,
	"uploadedById" uuid,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_minutes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"meetingId" uuid NOT NULL,
	"content" text NOT NULL,
	"createdById" uuid NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_rsvps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meetingId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"startTime" timestamp (3) NOT NULL,
	"endTime" timestamp (3),
	"location" text,
	"status" "MeetingStatus" DEFAULT 'scheduled' NOT NULL,
	"checkInCode" varchar(12),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"workspaceId" uuid NOT NULL,
	"roleId" uuid,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_reads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"messageId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"readAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"subject" text NOT NULL,
	"subgroupId" uuid,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"threadId" uuid NOT NULL,
	"senderId" uuid NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_prefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"channel" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"digest" text DEFAULT 'never' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"type" text DEFAULT 'info' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"link" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "participation_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"period" text NOT NULL,
	"periodType" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"computedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "passkeys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"credentialId" text NOT NULL,
	"publicKey" text NOT NULL,
	"counter" bigint DEFAULT 0 NOT NULL,
	"transports" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "passkeys_credentialId_unique" UNIQUE("credentialId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "proposal_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text,
	"createdById" uuid NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" "ProposalStatus" DEFAULT 'pending' NOT NULL,
	"createdById" uuid NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"title" text NOT NULL,
	"itemName" text NOT NULL,
	"costCents" bigint NOT NULL,
	"justification" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"status" "PurchaseRequestStatus" DEFAULT 'draft' NOT NULL,
	"submittedById" uuid NOT NULL,
	"reviewedById" uuid,
	"reviewComment" text,
	"receiptUrl" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"createdById" uuid NOT NULL,
	"type" text NOT NULL,
	"format" text NOT NULL,
	"periodStart" timestamp (3),
	"periodEnd" timestamp (3),
	"status" text DEFAULT 'pending' NOT NULL,
	"storagePath" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"isSystem" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saved_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"entityType" text NOT NULL,
	"name" text NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"isShared" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"tokenHash" text NOT NULL,
	"provider" text NOT NULL,
	"expiresAt" timestamp (3) NOT NULL,
	"revokedAt" timestamp (3),
	"lastSeenAt" timestamp (3) DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "showcase_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"imageUrl" text,
	"linkUrl" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdById" uuid NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sub_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taskId" uuid NOT NULL,
	"title" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subgroup_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subgroupId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"joinedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subgroups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#0f62fe',
	"createdById" uuid NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taskId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "TaskStatus" DEFAULT 'todo' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"dueDate" timestamp (3),
	"createdById" uuid NOT NULL,
	"assigneeId" uuid,
	"subgroupId" uuid,
	"meetingId" uuid,
	"dependsOnId" uuid,
	"recurrence" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"amountCents" bigint NOT NULL,
	"type" "TransactionType" NOT NULL,
	"category" text,
	"description" text,
	"date" timestamp (3) DEFAULT now() NOT NULL,
	"createdById" uuid,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" timestamp (3),
	"image" text,
	"passwordHash" text,
	"disabled" boolean DEFAULT false NOT NULL,
	"locale" varchar(8) DEFAULT 'en-US' NOT NULL,
	"timezone" varchar(64) DEFAULT 'UTC' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "volunteer_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slotId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "volunteer_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"startTime" timestamp (3) NOT NULL,
	"endTime" timestamp (3) NOT NULL,
	"capacity" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"secret" text,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"entityType" text NOT NULL,
	"name" text NOT NULL,
	"stages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"logoUrl" text,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "activity_feed" ADD CONSTRAINT "activity_feed_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "activity_feed" ADD CONSTRAINT "activity_feed_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "annual_event_plans" ADD CONSTRAINT "annual_event_plans_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "approvals" ADD CONSTRAINT "approvals_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "approvals" ADD CONSTRAINT "approvals_workflowId_workflows_id_fk" FOREIGN KEY ("workflowId") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approverId_users_id_fk" FOREIGN KEY ("approverId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "attachments" ADD CONSTRAINT "attachments_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploadedById_users_id_fk" FOREIGN KEY ("uploadedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "attendance" ADD CONSTRAINT "attendance_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "attendance" ADD CONSTRAINT "attendance_meetingId_meetings_id_fk" FOREIGN KEY ("meetingId") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "attendance" ADD CONSTRAINT "attendance_eventId_events_id_fk" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "attendance" ADD CONSTRAINT "attendance_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "budget_allocations" ADD CONSTRAINT "budget_allocations_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "budget_transactions" ADD CONSTRAINT "budget_transactions_allocationId_budget_allocations_id_fk" FOREIGN KEY ("allocationId") REFERENCES "public"."budget_allocations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "budget_transactions" ADD CONSTRAINT "budget_transactions_decidedById_users_id_fk" FOREIGN KEY ("decidedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "cooperation_requests" ADD CONSTRAINT "cooperation_requests_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "cooperation_requests" ADD CONSTRAINT "cooperation_requests_submittedById_users_id_fk" FOREIGN KEY ("submittedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "cooperation_requests" ADD CONSTRAINT "cooperation_requests_reviewedById_users_id_fk" FOREIGN KEY ("reviewedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "custom_field_defs" ADD CONSTRAINT "custom_field_defs_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "events" ADD CONSTRAINT "events_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "events" ADD CONSTRAINT "events_approvedById_users_id_fk" FOREIGN KEY ("approvedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "events" ADD CONSTRAINT "events_annualPlanId_annual_event_plans_id_fk" FOREIGN KEY ("annualPlanId") REFERENCES "public"."annual_event_plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "events" ADD CONSTRAINT "events_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "historical_members" ADD CONSTRAINT "historical_members_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "kudos" ADD CONSTRAINT "kudos_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "kudos" ADD CONSTRAINT "kudos_senderId_users_id_fk" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "kudos" ADD CONSTRAINT "kudos_receiverId_users_id_fk" FOREIGN KEY ("receiverId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "link_items" ADD CONSTRAINT "link_items_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "link_items" ADD CONSTRAINT "link_items_uploadedById_users_id_fk" FOREIGN KEY ("uploadedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_meetingId_meetings_id_fk" FOREIGN KEY ("meetingId") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "meeting_rsvps" ADD CONSTRAINT "meeting_rsvps_meetingId_meetings_id_fk" FOREIGN KEY ("meetingId") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "meeting_rsvps" ADD CONSTRAINT "meeting_rsvps_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "meetings" ADD CONSTRAINT "meetings_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "memberships" ADD CONSTRAINT "memberships_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_messageId_messages_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_subgroupId_subgroups_id_fk" FOREIGN KEY ("subgroupId") REFERENCES "public"."subgroups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "messages" ADD CONSTRAINT "messages_threadId_message_threads_id_fk" FOREIGN KEY ("threadId") REFERENCES "public"."message_threads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_users_id_fk" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notification_prefs" ADD CONSTRAINT "notification_prefs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "participation_scores" ADD CONSTRAINT "participation_scores_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "participation_scores" ADD CONSTRAINT "participation_scores_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "proposal_templates" ADD CONSTRAINT "proposal_templates_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "proposal_templates" ADD CONSTRAINT "proposal_templates_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "proposals" ADD CONSTRAINT "proposals_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "proposals" ADD CONSTRAINT "proposals_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_submittedById_users_id_fk" FOREIGN KEY ("submittedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_reviewedById_users_id_fk" FOREIGN KEY ("reviewedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "reports" ADD CONSTRAINT "reports_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "reports" ADD CONSTRAINT "reports_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "roles" ADD CONSTRAINT "roles_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "showcase_items" ADD CONSTRAINT "showcase_items_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "showcase_items" ADD CONSTRAINT "showcase_items_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sub_tasks" ADD CONSTRAINT "sub_tasks_taskId_tasks_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "subgroup_memberships" ADD CONSTRAINT "subgroup_memberships_subgroupId_subgroups_id_fk" FOREIGN KEY ("subgroupId") REFERENCES "public"."subgroups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "subgroup_memberships" ADD CONSTRAINT "subgroup_memberships_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "subgroups" ADD CONSTRAINT "subgroups_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "subgroups" ADD CONSTRAINT "subgroups_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_taskId_tasks_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeId_users_id_fk" FOREIGN KEY ("assigneeId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_subgroupId_subgroups_id_fk" FOREIGN KEY ("subgroupId") REFERENCES "public"."subgroups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "volunteer_signups" ADD CONSTRAINT "volunteer_signups_slotId_volunteer_slots_id_fk" FOREIGN KEY ("slotId") REFERENCES "public"."volunteer_slots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "volunteer_signups" ADD CONSTRAINT "volunteer_signups_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "volunteer_slots" ADD CONSTRAINT "volunteer_slots_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "workflows" ADD CONSTRAINT "workflows_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_feed_ws_idx" ON "activity_feed" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_feed_ws_created_idx" ON "activity_feed" USING btree ("workspaceId","createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_feed_ws_entity_idx" ON "activity_feed" USING btree ("workspaceId","entityType");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "annual_event_plans_ws_idx" ON "annual_event_plans" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "annual_event_plans_ws_created_idx" ON "annual_event_plans" USING btree ("workspaceId","createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_tokens_ws_idx" ON "api_tokens" USING btree ("workspaceId");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "api_tokens_hash_uidx" ON "api_tokens" USING btree ("tokenHash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approvals_ws_idx" ON "approvals" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approvals_entity_idx" ON "approvals" USING btree ("entityType","entityId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approvals_pending_idx" ON "approvals" USING btree ("workspaceId","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attachments_ws_idx" ON "attachments" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attachments_entity_idx" ON "attachments" USING btree ("entityType","entityId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attachments_ws_created_idx" ON "attachments" USING btree ("workspaceId","createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_ws_idx" ON "attendance" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_meeting_idx" ON "attendance" USING btree ("meetingId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_event_idx" ON "attendance" USING btree ("eventId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_user_idx" ON "attendance" USING btree ("workspaceId","userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_ws_idx" ON "audit_logs" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_ws_created_idx" ON "audit_logs" USING btree ("workspaceId","createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_ws_entity_idx" ON "audit_logs" USING btree ("workspaceId","entityType");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_user_idx" ON "audit_logs" USING btree ("userId");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_identities_provider_uidx" ON "auth_identities" USING btree ("provider","providerAccountId");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_identities_user_uidx" ON "auth_identities" USING btree ("userId","provider");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_identities_user_idx" ON "auth_identities" USING btree ("userId");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_pending_state_uidx" ON "auth_pending" USING btree ("state");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_pending_expires_idx" ON "auth_pending" USING btree ("expiresAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "budget_allocations_ws_idx" ON "budget_allocations" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "budget_allocations_ws_year_idx" ON "budget_allocations" USING btree ("workspaceId","fiscalYear");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "budget_allocations_ws_created_idx" ON "budget_allocations" USING btree ("workspaceId","createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "budget_transactions_alloc_idx" ON "budget_transactions" USING btree ("allocationId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cooperation_requests_ws_idx" ON "cooperation_requests" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cooperation_requests_ws_status_idx" ON "cooperation_requests" USING btree ("workspaceId","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cooperation_requests_ws_created_idx" ON "cooperation_requests" USING btree ("workspaceId","createdAt");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "custom_field_defs_uidx" ON "custom_field_defs" USING btree ("workspaceId","entityType","key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "custom_field_defs_ws_idx" ON "custom_field_defs" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_otps_email_idx" ON "email_otps" USING btree ("email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_otps_expires_idx" ON "email_otps" USING btree ("expiresAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_ws_idx" ON "events" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_ws_status_start_idx" ON "events" USING btree ("workspaceId","status","startDate");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_ws_start_idx" ON "events" USING btree ("workspaceId","startDate");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_approval_idx" ON "events" USING btree ("approvalStatus");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_ws_created_idx" ON "events" USING btree ("workspaceId","createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_plan_idx" ON "events" USING btree ("annualPlanId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "historical_members_ws_idx" ON "historical_members" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kudos_ws_idx" ON "kudos" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kudos_ws_receiver_idx" ON "kudos" USING btree ("workspaceId","receiverId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kudos_ws_created_idx" ON "kudos" USING btree ("workspaceId","createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "link_items_ws_idx" ON "link_items" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "link_items_ws_created_idx" ON "link_items" USING btree ("workspaceId","createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "link_items_ws_category_idx" ON "link_items" USING btree ("workspaceId","category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meeting_minutes_meeting_idx" ON "meeting_minutes" USING btree ("meetingId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meeting_minutes_ws_idx" ON "meeting_minutes" USING btree ("workspaceId");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "meeting_rsvps_uidx" ON "meeting_rsvps" USING btree ("meetingId","userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meeting_rsvps_user_idx" ON "meeting_rsvps" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_ws_idx" ON "meetings" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_ws_start_idx" ON "meetings" USING btree ("workspaceId","startTime");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_ws_created_idx" ON "meetings" USING btree ("workspaceId","createdAt");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "memberships_user_ws_uidx" ON "memberships" USING btree ("userId","workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memberships_user_idx" ON "memberships" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memberships_ws_idx" ON "memberships" USING btree ("workspaceId");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "message_reads_uidx" ON "message_reads" USING btree ("messageId","userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_reads_user_idx" ON "message_reads" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_threads_ws_idx" ON "message_threads" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_threads_ws_updated_idx" ON "message_threads" USING btree ("workspaceId","updatedAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_threads_sub_idx" ON "message_threads" USING btree ("subgroupId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_thread_idx" ON "messages" USING btree ("threadId");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_prefs_uidx" ON "notification_prefs" USING btree ("userId","channel");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_ws_user_read_idx" ON "notifications" USING btree ("workspaceId","userId","read");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_read_created_idx" ON "notifications" USING btree ("userId","read","createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_ws_idx" ON "notifications" USING btree ("workspaceId");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "participation_scores_uidx" ON "participation_scores" USING btree ("workspaceId","userId","period","periodType");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "participation_scores_period_idx" ON "participation_scores" USING btree ("workspaceId","period","periodType","score");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "passkeys_cred_uidx" ON "passkeys" USING btree ("credentialId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "passkeys_user_idx" ON "passkeys" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proposal_templates_ws_idx" ON "proposal_templates" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proposal_templates_ws_created_idx" ON "proposal_templates" USING btree ("workspaceId","createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proposals_ws_idx" ON "proposals" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proposals_ws_status_idx" ON "proposals" USING btree ("workspaceId","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proposals_ws_created_idx" ON "proposals" USING btree ("workspaceId","createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_requests_ws_idx" ON "purchase_requests" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_requests_ws_status_idx" ON "purchase_requests" USING btree ("workspaceId","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_requests_ws_created_idx" ON "purchase_requests" USING btree ("workspaceId","createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reports_ws_idx" ON "reports" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reports_ws_created_idx" ON "reports" USING btree ("workspaceId","createdAt");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "roles_ws_name_uidx" ON "roles" USING btree ("workspaceId","name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roles_ws_idx" ON "roles" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saved_views_ws_idx" ON "saved_views" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saved_views_user_idx" ON "saved_views" USING btree ("workspaceId","userId");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_uidx" ON "sessions" USING btree ("tokenHash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_idx" ON "sessions" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_expires_idx" ON "sessions" USING btree ("expiresAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "showcase_items_ws_idx" ON "showcase_items" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "showcase_items_ws_active_idx" ON "showcase_items" USING btree ("workspaceId","isActive");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "showcase_items_ws_sort_idx" ON "showcase_items" USING btree ("workspaceId","isActive","sortOrder");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sub_tasks_task_idx" ON "sub_tasks" USING btree ("taskId");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subgroup_memberships_uidx" ON "subgroup_memberships" USING btree ("subgroupId","userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subgroup_memberships_user_idx" ON "subgroup_memberships" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subgroup_memberships_sub_idx" ON "subgroup_memberships" USING btree ("subgroupId");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subgroups_ws_name_uidx" ON "subgroups" USING btree ("workspaceId","name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subgroups_ws_idx" ON "subgroups" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_comments_task_idx" ON "task_comments" USING btree ("taskId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_ws_idx" ON "tasks" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_ws_assignee_status_idx" ON "tasks" USING btree ("workspaceId","assigneeId","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_ws_status_idx" ON "tasks" USING btree ("workspaceId","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_due_idx" ON "tasks" USING btree ("dueDate");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_ws_created_idx" ON "tasks" USING btree ("workspaceId","createdAt");
--> statement-breakpoint
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_subgroup_idx" ON "tasks" USING btree ("subgroupId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_ws_idx" ON "transactions" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_ws_date_idx" ON "transactions" USING btree ("workspaceId","date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_ws_type_idx" ON "transactions" USING btree ("workspaceId","type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_ws_created_idx" ON "transactions" USING btree ("workspaceId","createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" USING btree ("createdAt");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "volunteer_signups_uidx" ON "volunteer_signups" USING btree ("slotId","userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_signups_user_idx" ON "volunteer_signups" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_signups_slot_idx" ON "volunteer_signups" USING btree ("slotId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_slots_ws_idx" ON "volunteer_slots" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_slots_ws_start_idx" ON "volunteer_slots" USING btree ("workspaceId","startTime");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "volunteer_slots_ws_created_idx" ON "volunteer_slots" USING btree ("workspaceId","createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhooks_ws_idx" ON "webhooks" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflows_ws_idx" ON "workflows" USING btree ("workspaceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflows_ws_entity_idx" ON "workflows" USING btree ("workspaceId","entityType");
--> statement-breakpoint

