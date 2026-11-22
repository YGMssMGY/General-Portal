import {
    bigint,
    boolean,
    index,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("Role", ["admin", "officer", "member"]);
export const proposalStatusEnum = pgEnum("ProposalStatus", ["pending", "approved", "rejected"]);
export const taskStatusEnum = pgEnum("TaskStatus", ["todo", "in_progress", "done"]);
export const eventStatusEnum = pgEnum("EventStatus", ["draft", "published", "cancelled"]);
export const meetingStatusEnum = pgEnum("MeetingStatus", [
    "scheduled",
    "ongoing",
    "completed",
    "cancelled",
]);
export const transactionTypeEnum = pgEnum("TransactionType", ["income", "expense"]);
export const budgetStatusEnum = pgEnum("BudgetStatus", ["active", "spent", "reconciled"]);
export const approvalStatusEnum = pgEnum("ApprovalStatus", ["pending", "approved", "rejected"]);
export const purchaseRequestStatusEnum = pgEnum("PurchaseRequestStatus", [
    "draft",
    "submitted",
    "under_review",
    "approved",
    "rejected",
    "fulfilled",
]);

const id = () => uuid("id").primaryKey().defaultRandom();
const ts = (name: string) => timestamp(name, { mode: "date", precision: 3 }).notNull().defaultNow();
const tsOpt = (name: string) => timestamp(name, { mode: "date", precision: 3 });
const updatedAt = () =>
    timestamp("updatedAt", { mode: "date", precision: 3 })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date());
const deletedAt = () => tsOpt("deletedAt");
const meta = (name: string) => jsonb(name).$type<Record<string, unknown>>().notNull().default({});

export const users = pgTable(
    "users",
    {
        id: id(),
        name: text("name"),
        email: text("email").notNull().unique(),
        emailVerified: tsOpt("emailVerified"),
        image: text("image"),
        passwordHash: text("passwordHash"),
        disabled: boolean("disabled").notNull().default(false),
        locale: varchar("locale", { length: 8 }).notNull().default("en-US"),
        timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
        uiPrefs: jsonb("uiPrefs").$type<Record<string, unknown>>().notNull().default({}),
        createdAt: ts("createdAt"),
        updatedAt: updatedAt(),
    },
    (t) => [index("users_created_at_idx").on(t.createdAt)],
);

export const workspaces = pgTable("workspaces", {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    logoUrl: text("logoUrl"),
    settings: jsonb("settings").$type<Record<string, boolean>>().notNull().default({}),
    createdAt: ts("createdAt"),
    updatedAt: updatedAt(),
});

export const roles = pgTable(
    "roles",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        description: text("description"),
        permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
        isSystem: boolean("isSystem").notNull().default(false),
        createdAt: ts("createdAt"),
    },
    (t) => [
        uniqueIndex("roles_ws_name_uidx").on(t.workspaceId, t.name),
        index("roles_ws_idx").on(t.workspaceId),
    ],
);

export const comments = pgTable(
    "comments",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        entityType: text("entityType").notNull(),
        entityId: uuid("entityId").notNull(),
        userId: uuid("userId")
            .notNull()
            .references(() => users.id),
        body: text("body").notNull(),
        createdAt: ts("createdAt"),
        updatedAt: updatedAt(),
        deletedAt: deletedAt(),
    },
    (t) => [
        index("comments_ws_entity_idx").on(t.workspaceId, t.entityType, t.entityId),
        index("comments_user_idx").on(t.userId),
    ],
);

export const invitations = pgTable(
    "invitations",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        email: text("email").notNull(),
        roleName: text("roleName").notNull().default("member"),
        tokenHash: text("tokenHash").notNull(),
        invitedById: uuid("invitedById").references(() => users.id),
        expiresAt: ts("expiresAt"),
        acceptedAt: tsOpt("acceptedAt"),
        revokedAt: tsOpt("revokedAt"),
        createdAt: ts("createdAt"),
    },
    (t) => [
        uniqueIndex("invitations_token_uidx").on(t.tokenHash),
        index("invitations_ws_idx").on(t.workspaceId),
    ],
);

export const memberships = pgTable(
    "memberships",
    {
        id: id(),
        userId: uuid("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        roleId: uuid("roleId").references(() => roles.id),
        createdAt: ts("createdAt"),
    },
    (t) => [
        uniqueIndex("memberships_user_ws_uidx").on(t.userId, t.workspaceId),
        index("memberships_user_idx").on(t.userId),
        index("memberships_ws_idx").on(t.workspaceId),
    ],
);

export const subgroups = pgTable(
    "subgroups",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        description: text("description"),
        color: text("color").default("#0f62fe"),
        createdById: uuid("createdById")
            .notNull()
            .references(() => users.id),
        createdAt: ts("createdAt"),
        updatedAt: updatedAt(),
        deletedAt: deletedAt(),
    },
    (t) => [
        uniqueIndex("subgroups_ws_name_uidx").on(t.workspaceId, t.name),
        index("subgroups_ws_idx").on(t.workspaceId),
    ],
);

export const subgroupMemberships = pgTable(
    "subgroup_memberships",
    {
        id: id(),
        subgroupId: uuid("subgroupId")
            .notNull()
            .references(() => subgroups.id, { onDelete: "cascade" }),
        userId: uuid("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        joinedAt: ts("joinedAt"),
    },
    (t) => [
        uniqueIndex("subgroup_memberships_uidx").on(t.subgroupId, t.userId),
        index("subgroup_memberships_user_idx").on(t.userId),
        index("subgroup_memberships_sub_idx").on(t.subgroupId),
    ],
);

export const proposals = pgTable(
    "proposals",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        description: text("description").notNull(),
        status: proposalStatusEnum("status").notNull().default("pending"),
        metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
        createdById: uuid("createdById")
            .notNull()
            .references(() => users.id),
        createdAt: ts("createdAt"),
        updatedAt: updatedAt(),
        deletedAt: deletedAt(),
    },
    (t) => [
        index("proposals_ws_idx").on(t.workspaceId),
        index("proposals_ws_status_idx").on(t.workspaceId, t.status),
        index("proposals_ws_created_idx").on(t.workspaceId, t.createdAt),
    ],
);

export const proposalTemplates = pgTable(
    "proposal_templates",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        description: text("description").notNull(),
        category: text("category"),
        createdById: uuid("createdById")
            .notNull()
            .references(() => users.id),
        createdAt: ts("createdAt"),
        updatedAt: updatedAt(),
        deletedAt: deletedAt(),
    },
    (t) => [
        index("proposal_templates_ws_idx").on(t.workspaceId),
        index("proposal_templates_ws_created_idx").on(t.workspaceId, t.createdAt),
    ],
);

export const tasks = pgTable(
    "tasks",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        description: text("description"),
        status: taskStatusEnum("status").notNull().default("todo"),
        priority: integer("priority").notNull().default(0),
        dueDate: tsOpt("dueDate"),
        createdById: uuid("createdById")
            .notNull()
            .references(() => users.id),
        assigneeId: uuid("assigneeId").references(() => users.id),
        subgroupId: uuid("subgroupId").references(() => subgroups.id),
        meetingId: uuid("meetingId"),
        dependsOnId: uuid("dependsOnId"),
        recurrence: text("recurrence"),
        metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
        createdAt: ts("createdAt"),
        updatedAt: updatedAt(),
        deletedAt: deletedAt(),
    },
    (t) => [
        index("tasks_ws_idx").on(t.workspaceId),
        index("tasks_ws_assignee_status_idx").on(t.workspaceId, t.assigneeId, t.status),
        index("tasks_ws_status_idx").on(t.workspaceId, t.status),
        index("tasks_due_idx").on(t.dueDate),
        index("tasks_ws_created_idx").on(t.workspaceId, t.createdAt),
        index("tasks_meeting_idx").on(t.meetingId),
        index("tasks_subgroup_idx").on(t.subgroupId),
    ],
);

export const subTasks = pgTable(
    "sub_tasks",
    {
        id: id(),
        taskId: uuid("taskId")
            .notNull()
            .references(() => tasks.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        done: boolean("done").notNull().default(false),
        createdAt: ts("createdAt"),
    },
    (t) => [index("sub_tasks_task_idx").on(t.taskId)],
);

export const taskComments = pgTable(
    "task_comments",
    {
        id: id(),
        taskId: uuid("taskId")
            .notNull()
            .references(() => tasks.id, { onDelete: "cascade" }),
        userId: uuid("userId")
            .notNull()
            .references(() => users.id),
        content: text("content").notNull(),
        createdAt: ts("createdAt"),
    },
    (t) => [index("task_comments_task_idx").on(t.taskId)],
);

export const annualEventPlans = pgTable(
    "annual_event_plans",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        academicYear: text("academicYear").notNull(),
        description: text("description"),
        isActive: boolean("isActive").notNull().default(false),
        createdAt: ts("createdAt"),
        updatedAt: updatedAt(),
        deletedAt: deletedAt(),
    },
    (t) => [
        index("annual_event_plans_ws_idx").on(t.workspaceId),
        index("annual_event_plans_ws_created_idx").on(t.workspaceId, t.createdAt),
    ],
);

export const events = pgTable(
    "events",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        description: text("description"),
        startDate: timestamp("startDate", { mode: "date", precision: 3 }).notNull(),
        endDate: tsOpt("endDate"),
        location: text("location"),
        isPublic: boolean("isPublic").notNull().default(false),
        status: eventStatusEnum("status").notNull().default("draft"),
        approvalStatus: approvalStatusEnum("approvalStatus").notNull().default("pending"),
        approvedById: uuid("approvedById").references(() => users.id),
        approvedAt: tsOpt("approvedAt"),
        reviewComment: text("reviewComment"),
        teamsMessageId: text("teamsMessageId"),
        annualPlanId: uuid("annualPlanId").references(() => annualEventPlans.id),
        recurrence: text("recurrence"),
        metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
        createdById: uuid("createdById")
            .notNull()
            .references(() => users.id),
        createdAt: ts("createdAt"),
        updatedAt: updatedAt(),
        deletedAt: deletedAt(),
    },
    (t) => [
        index("events_ws_idx").on(t.workspaceId),
        index("events_ws_status_start_idx").on(t.workspaceId, t.status, t.startDate),
        index("events_ws_start_idx").on(t.workspaceId, t.startDate),
        index("events_approval_idx").on(t.approvalStatus),
        index("events_ws_created_idx").on(t.workspaceId, t.createdAt),
        index("events_plan_idx").on(t.annualPlanId),
    ],
);

export const meetings = pgTable(
    "meetings",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        description: text("description"),
        startTime: timestamp("startTime", { mode: "date", precision: 3 }).notNull(),
        endTime: tsOpt("endTime"),
        location: text("location"),
        status: meetingStatusEnum("status").notNull().default("scheduled"),
        checkInCode: varchar("checkInCode", { length: 12 }),
        createdAt: ts("createdAt"),
        updatedAt: updatedAt(),
        deletedAt: deletedAt(),
    },
    (t) => [
        index("meetings_ws_idx").on(t.workspaceId),
        index("meetings_ws_start_idx").on(t.workspaceId, t.startTime),
        index("meetings_ws_created_idx").on(t.workspaceId, t.createdAt),
    ],
);

export const meetingRsvps = pgTable(
    "meeting_rsvps",
    {
        id: id(),
        meetingId: uuid("meetingId")
            .notNull()
            .references(() => meetings.id, { onDelete: "cascade" }),
        userId: uuid("userId")
            .notNull()
            .references(() => users.id),
        status: text("status").notNull().default("pending"),
        createdAt: ts("createdAt"),
    },
    (t) => [
        uniqueIndex("meeting_rsvps_uidx").on(t.meetingId, t.userId),
        index("meeting_rsvps_user_idx").on(t.userId),
    ],
);

export const meetingMinutes = pgTable(
    "meeting_minutes",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        meetingId: uuid("meetingId")
            .notNull()
            .references(() => meetings.id, { onDelete: "cascade" }),
        content: text("content").notNull(),
        createdById: uuid("createdById")
            .notNull()
            .references(() => users.id),
        createdAt: ts("createdAt"),
    },
    (t) => [
        index("meeting_minutes_meeting_idx").on(t.meetingId),
        index("meeting_minutes_ws_idx").on(t.workspaceId),
    ],
);

export const attendance = pgTable(
    "attendance",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        meetingId: uuid("meetingId").references(() => meetings.id, { onDelete: "cascade" }),
        eventId: uuid("eventId").references(() => events.id, { onDelete: "cascade" }),
        userId: uuid("userId")
            .notNull()
            .references(() => users.id),
        status: text("status").notNull().default("present"),
        checkedInAt: tsOpt("checkedInAt"),
        createdAt: ts("createdAt"),
    },
    (t) => [
        index("attendance_ws_idx").on(t.workspaceId),
        index("attendance_meeting_idx").on(t.meetingId),
        index("attendance_event_idx").on(t.eventId),
        index("attendance_user_idx").on(t.workspaceId, t.userId),
    ],
);

export const messageThreads = pgTable(
    "message_threads",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        subject: text("subject").notNull(),
        subgroupId: uuid("subgroupId").references(() => subgroups.id),
        createdAt: ts("createdAt"),
        updatedAt: updatedAt(),
        deletedAt: deletedAt(),
    },
    (t) => [
        index("message_threads_ws_idx").on(t.workspaceId),
        index("message_threads_ws_updated_idx").on(t.workspaceId, t.updatedAt),
        index("message_threads_sub_idx").on(t.subgroupId),
    ],
);

export const messages = pgTable(
    "messages",
    {
        id: id(),
        threadId: uuid("threadId")
            .notNull()
            .references(() => messageThreads.id, { onDelete: "cascade" }),
        senderId: uuid("senderId")
            .notNull()
            .references(() => users.id),
        content: text("content").notNull(),
        createdAt: ts("createdAt"),
    },
    (t) => [index("messages_thread_idx").on(t.threadId)],
);

export const messageReads = pgTable(
    "message_reads",
    {
        id: id(),
        messageId: uuid("messageId")
            .notNull()
            .references(() => messages.id, { onDelete: "cascade" }),
        userId: uuid("userId")
            .notNull()
            .references(() => users.id),
        readAt: ts("readAt"),
    },
    (t) => [
        uniqueIndex("message_reads_uidx").on(t.messageId, t.userId),
        index("message_reads_user_idx").on(t.userId),
    ],
);

export const transactions = pgTable(
    "transactions",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        amountCents: bigint("amountCents", { mode: "number" }).notNull(),
        type: transactionTypeEnum("type").notNull(),
        category: text("category"),
        description: text("description"),
        date: ts("date"),
        createdById: uuid("createdById").references(() => users.id),
        createdAt: ts("createdAt"),
        deletedAt: deletedAt(),
    },
    (t) => [
        index("transactions_ws_idx").on(t.workspaceId),
        index("transactions_ws_date_idx").on(t.workspaceId, t.date),
        index("transactions_ws_type_idx").on(t.workspaceId, t.type),
        index("transactions_ws_created_idx").on(t.workspaceId, t.createdAt),
    ],
);

export const budgetAllocations = pgTable(
    "budget_allocations",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        category: text("category").notNull(),
        amountCents: bigint("amountCents", { mode: "number" }).notNull(),
        spentCents: bigint("spentCents", { mode: "number" }).notNull().default(0),
        fiscalYear: integer("fiscalYear").notNull(),
        status: budgetStatusEnum("status").notNull().default("active"),
        description: text("description"),
        createdAt: ts("createdAt"),
        updatedAt: updatedAt(),
        deletedAt: deletedAt(),
    },
    (t) => [
        index("budget_allocations_ws_idx").on(t.workspaceId),
        index("budget_allocations_ws_year_idx").on(t.workspaceId, t.fiscalYear),
        index("budget_allocations_ws_created_idx").on(t.workspaceId, t.createdAt),
    ],
);

export const budgetTransactions = pgTable(
    "budget_transactions",
    {
        id: id(),
        allocationId: uuid("allocationId")
            .notNull()
            .references(() => budgetAllocations.id, { onDelete: "cascade" }),
        amountCents: bigint("amountCents", { mode: "number" }).notNull(),
        type: transactionTypeEnum("type").notNull(),
        description: text("description"),
        decidedById: uuid("decidedById").references(() => users.id),
        receiptUrl: text("receiptUrl"),
        createdAt: ts("createdAt"),
    },
    (t) => [index("budget_transactions_alloc_idx").on(t.allocationId)],
);

export const purchaseRequests = pgTable(
    "purchase_requests",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        itemName: text("itemName").notNull(),
        costCents: bigint("costCents", { mode: "number" }).notNull(),
        justification: text("justification").notNull(),
        quantity: integer("quantity").notNull().default(1),
        status: purchaseRequestStatusEnum("status").notNull().default("draft"),
        submittedById: uuid("submittedById")
            .notNull()
            .references(() => users.id),
        reviewedById: uuid("reviewedById").references(() => users.id),
        reviewComment: text("reviewComment"),
        receiptUrl: text("receiptUrl"),
        createdAt: ts("createdAt"),
        updatedAt: updatedAt(),
        deletedAt: deletedAt(),
    },
    (t) => [
        index("purchase_requests_ws_idx").on(t.workspaceId),
        index("purchase_requests_ws_status_idx").on(t.workspaceId, t.status),
        index("purchase_requests_ws_created_idx").on(t.workspaceId, t.createdAt),
    ],
);

export const cooperationRequests = pgTable(
    "cooperation_requests",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        clubName: text("clubName").notNull(),
        contactName: text("contactName").notNull(),
        contactEmail: text("contactEmail").notNull(),
        eventTitle: text("eventTitle").notNull(),
        description: text("description").notNull(),
        proposedDate: tsOpt("proposedDate"),
        resourcesNeeded: text("resourcesNeeded"),
        status: text("status").notNull().default("pending"),
        submittedById: uuid("submittedById")
            .notNull()
            .references(() => users.id),
        reviewedById: uuid("reviewedById").references(() => users.id),
        createdAt: ts("createdAt"),
        updatedAt: updatedAt(),
        deletedAt: deletedAt(),
    },
    (t) => [
        index("cooperation_requests_ws_idx").on(t.workspaceId),
        index("cooperation_requests_ws_status_idx").on(t.workspaceId, t.status),
        index("cooperation_requests_ws_created_idx").on(t.workspaceId, t.createdAt),
    ],
);

export const volunteerSlots = pgTable(
    "volunteer_slots",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        description: text("description"),
        startTime: timestamp("startTime", { mode: "date", precision: 3 }).notNull(),
        endTime: timestamp("endTime", { mode: "date", precision: 3 }).notNull(),
        capacity: integer("capacity").notNull().default(1),
        createdAt: ts("createdAt"),
        deletedAt: deletedAt(),
    },
    (t) => [
        index("volunteer_slots_ws_idx").on(t.workspaceId),
        index("volunteer_slots_ws_start_idx").on(t.workspaceId, t.startTime),
        index("volunteer_slots_ws_created_idx").on(t.workspaceId, t.createdAt),
    ],
);

export const volunteerSignups = pgTable(
    "volunteer_signups",
    {
        id: id(),
        slotId: uuid("slotId")
            .notNull()
            .references(() => volunteerSlots.id, { onDelete: "cascade" }),
        userId: uuid("userId")
            .notNull()
            .references(() => users.id),
        createdAt: ts("createdAt"),
    },
    (t) => [
        uniqueIndex("volunteer_signups_uidx").on(t.slotId, t.userId),
        index("volunteer_signups_user_idx").on(t.userId),
        index("volunteer_signups_slot_idx").on(t.slotId),
    ],
);

export const notifications = pgTable(
    "notifications",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        userId: uuid("userId")
            .notNull()
            .references(() => users.id),
        title: text("title").notNull(),
        body: text("body"),
        type: text("type").notNull().default("info"),
        read: boolean("read").notNull().default(false),
        link: text("link"),
        createdAt: ts("createdAt"),
    },
    (t) => [
        index("notifications_ws_user_read_idx").on(t.workspaceId, t.userId, t.read),
        index("notifications_user_read_created_idx").on(t.userId, t.read, t.createdAt),
        index("notifications_ws_idx").on(t.workspaceId),
    ],
);

export const notificationPrefs = pgTable(
    "notification_prefs",
    {
        id: id(),
        userId: uuid("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        channel: text("channel").notNull(),
        enabled: boolean("enabled").notNull().default(true),
        digest: text("digest").notNull().default("never"),
    },
    (t) => [uniqueIndex("notification_prefs_uidx").on(t.userId, t.channel)],
);

export const auditLogs = pgTable(
    "audit_logs",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        userId: uuid("userId").references(() => users.id),
        action: text("action").notNull(),
        entityType: text("entityType").notNull(),
        entityId: text("entityId"),
        metadata: meta("metadata"),
        ipAddress: text("ipAddress"),
        prevHash: text("prevHash"),
        hash: text("hash"),
        createdAt: ts("createdAt"),
    },
    (t) => [
        index("audit_logs_ws_idx").on(t.workspaceId),
        index("audit_logs_ws_created_idx").on(t.workspaceId, t.createdAt),
        index("audit_logs_ws_entity_idx").on(t.workspaceId, t.entityType),
        index("audit_logs_user_idx").on(t.userId),
    ],
);

export const activityFeed = pgTable(
    "activity_feed",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        userId: uuid("userId").references(() => users.id),
        action: text("action").notNull(),
        entityType: text("entityType").notNull(),
        entityId: text("entityId"),
        metadata: meta("metadata"),
        createdAt: ts("createdAt"),
    },
    (t) => [
        index("activity_feed_ws_idx").on(t.workspaceId),
        index("activity_feed_ws_created_idx").on(t.workspaceId, t.createdAt),
        index("activity_feed_ws_entity_idx").on(t.workspaceId, t.entityType),
    ],
);

export const kudos = pgTable(
    "kudos",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        senderId: uuid("senderId")
            .notNull()
            .references(() => users.id),
        receiverId: uuid("receiverId")
            .notNull()
            .references(() => users.id),
        message: text("message"),
        createdAt: ts("createdAt"),
    },
    (t) => [
        index("kudos_ws_idx").on(t.workspaceId),
        index("kudos_ws_receiver_idx").on(t.workspaceId, t.receiverId),
        index("kudos_ws_created_idx").on(t.workspaceId, t.createdAt),
    ],
);

export const attachments = pgTable(
    "attachments",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        entityType: text("entityType").notNull(),
        entityId: text("entityId").notNull(),
        fileName: text("fileName").notNull(),
        fileSize: integer("fileSize").notNull(),
        mimeType: text("mimeType").notNull(),
        storagePath: text("storagePath").notNull(),
        sha256: text("sha256"),
        uploadedById: uuid("uploadedById").references(() => users.id),
        createdAt: ts("createdAt"),
        deletedAt: deletedAt(),
    },
    (t) => [
        index("attachments_ws_idx").on(t.workspaceId),
        index("attachments_entity_idx").on(t.entityType, t.entityId),
        index("attachments_ws_created_idx").on(t.workspaceId, t.createdAt),
    ],
);

export const linkItems = pgTable(
    "link_items",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        url: text("url").notNull(),
        description: text("description"),
        category: text("category"),
        uploadedById: uuid("uploadedById").references(() => users.id),
        lastCheckedAt: tsOpt("lastCheckedAt"),
        checkStatus: text("checkStatus").notNull().default("unknown"),
        createdAt: ts("createdAt"),
        updatedAt: updatedAt(),
        deletedAt: deletedAt(),
    },
    (t) => [
        index("link_items_ws_idx").on(t.workspaceId),
        index("link_items_ws_created_idx").on(t.workspaceId, t.createdAt),
        index("link_items_ws_category_idx").on(t.workspaceId, t.category),
    ],
);

export const historicalMembers = pgTable(
    "historical_members",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        role: text("role").notNull(),
        councilType: text("councilType").notNull().default("student_council"),
        academicYear: text("academicYear").notNull(),
        startDate: tsOpt("startDate"),
        endDate: tsOpt("endDate"),
        notes: text("notes"),
        createdAt: ts("createdAt"),
    },
    (t) => [index("historical_members_ws_idx").on(t.workspaceId)],
);

export const showcaseItems = pgTable(
    "showcase_items",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        type: text("type").notNull(),
        title: text("title").notNull(),
        description: text("description"),
        imageUrl: text("imageUrl"),
        linkUrl: text("linkUrl"),
        sortOrder: integer("sortOrder").notNull().default(0),
        isActive: boolean("isActive").notNull().default(true),
        createdById: uuid("createdById")
            .notNull()
            .references(() => users.id),
        createdAt: ts("createdAt"),
        updatedAt: updatedAt(),
        deletedAt: deletedAt(),
    },
    (t) => [
        index("showcase_items_ws_idx").on(t.workspaceId),
        index("showcase_items_ws_active_idx").on(t.workspaceId, t.isActive),
        index("showcase_items_ws_sort_idx").on(t.workspaceId, t.isActive, t.sortOrder),
    ],
);

export const customFieldDefs = pgTable(
    "custom_field_defs",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        entityType: text("entityType").notNull(),
        key: text("key").notNull(),
        label: text("label").notNull(),
        fieldType: text("fieldType").notNull(),
        required: boolean("required").notNull().default(false),
        options: jsonb("options").$type<string[]>().notNull().default([]),
        position: integer("position").notNull().default(0),
        createdAt: ts("createdAt"),
    },
    (t) => [
        uniqueIndex("custom_field_defs_uidx").on(t.workspaceId, t.entityType, t.key),
        index("custom_field_defs_ws_idx").on(t.workspaceId),
    ],
);

export const workflows = pgTable(
    "workflows",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        entityType: text("entityType").notNull(),
        name: text("name").notNull(),
        stages: jsonb("stages")
            .$type<
                Array<{
                    name: string;
                    approverRoleId?: string;
                    approverId?: string;
                    slaHours?: number;
                    escalationRoleId?: string;
                }>
            >()
            .notNull()
            .default([]),
        isActive: boolean("isActive").notNull().default(true),
        createdAt: ts("createdAt"),
    },
    (t) => [
        index("workflows_ws_idx").on(t.workspaceId),
        index("workflows_ws_entity_idx").on(t.workspaceId, t.entityType),
    ],
);

export const approvals = pgTable(
    "approvals",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        workflowId: uuid("workflowId").references(() => workflows.id, { onDelete: "cascade" }),
        entityType: text("entityType").notNull(),
        entityId: text("entityId").notNull(),
        stageIndex: integer("stageIndex").notNull().default(0),
        approverId: uuid("approverId").references(() => users.id),
        status: text("status").notNull().default("pending"),
        comment: text("comment"),
        dueAt: tsOpt("dueAt"),
        decidedAt: tsOpt("decidedAt"),
        createdAt: ts("createdAt"),
    },
    (t) => [
        index("approvals_ws_idx").on(t.workspaceId),
        index("approvals_entity_idx").on(t.entityType, t.entityId),
        index("approvals_pending_idx").on(t.workspaceId, t.status),
    ],
);

export const savedViews = pgTable(
    "saved_views",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        userId: uuid("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        entityType: text("entityType").notNull(),
        name: text("name").notNull(),
        filters: jsonb("filters").$type<Record<string, unknown>>().notNull().default({}),
        isShared: boolean("isShared").notNull().default(false),
        shareVersion: integer("shareVersion").notNull().default(0),
        position: integer("position").notNull().default(0),
        createdAt: ts("createdAt"),
    },
    (t) => [
        index("saved_views_ws_idx").on(t.workspaceId),
        index("saved_views_user_idx").on(t.workspaceId, t.userId),
    ],
);

export const webhooks = pgTable(
    "webhooks",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        url: text("url").notNull(),
        secret: text("secret"),
        events: jsonb("events").$type<string[]>().notNull().default([]),
        active: boolean("active").notNull().default(true),
        createdAt: ts("createdAt"),
    },
    (t) => [index("webhooks_ws_idx").on(t.workspaceId)],
);

export const apiTokens = pgTable(
    "api_tokens",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        userId: uuid("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        tokenHash: text("tokenHash").notNull().unique(),
        scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
        expiresAt: tsOpt("expiresAt"),
        lastUsedAt: tsOpt("lastUsedAt"),
        createdAt: ts("createdAt"),
    },
    (t) => [
        index("api_tokens_ws_idx").on(t.workspaceId),
        uniqueIndex("api_tokens_hash_uidx").on(t.tokenHash),
    ],
);

export const participationScores = pgTable(
    "participation_scores",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        userId: uuid("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        period: text("period").notNull(),
        periodType: text("periodType").notNull(),
        score: integer("score").notNull().default(0),
        breakdown: jsonb("breakdown").$type<Record<string, number>>().notNull().default({}),
        computedAt: ts("computedAt"),
    },
    (t) => [
        uniqueIndex("participation_scores_uidx").on(
            t.workspaceId,
            t.userId,
            t.period,
            t.periodType,
        ),
        index("participation_scores_period_idx").on(t.workspaceId, t.period, t.periodType, t.score),
    ],
);

export const reports = pgTable(
    "reports",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        createdById: uuid("createdById")
            .notNull()
            .references(() => users.id),
        type: text("type").notNull(),
        format: text("format").notNull(),
        periodStart: tsOpt("periodStart"),
        periodEnd: tsOpt("periodEnd"),
        status: text("status").notNull().default("pending"),
        storagePath: text("storagePath"),
        createdAt: ts("createdAt"),
    },
    (t) => [
        index("reports_ws_idx").on(t.workspaceId),
        index("reports_ws_created_idx").on(t.workspaceId, t.createdAt),
    ],
);

export const sessions = pgTable(
    "sessions",
    {
        id: id(),
        userId: uuid("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        tokenHash: text("tokenHash").notNull().unique(),
        provider: text("provider").notNull(),
        expiresAt: timestamp("expiresAt", { mode: "date", precision: 3 }).notNull(),
        revokedAt: tsOpt("revokedAt"),
        lastSeenAt: ts("lastSeenAt"),
        ipAddress: text("ipAddress"),
        userAgent: text("userAgent"),
        createdAt: ts("createdAt"),
    },
    (t) => [
        uniqueIndex("sessions_token_uidx").on(t.tokenHash),
        index("sessions_user_idx").on(t.userId),
        index("sessions_expires_idx").on(t.expiresAt),
    ],
);

export const authPending = pgTable(
    "auth_pending",
    {
        id: id(),
        provider: text("provider").notNull(),
        state: text("state").notNull().unique(),
        nonce: text("nonce"),
        codeVerifier: text("codeVerifier"),
        portal: text("portal").notNull(),
        redirectUri: text("redirectUri").notNull(),
        email: text("email"),
        resource: text("resource"),
        createdAt: ts("createdAt"),
        expiresAt: timestamp("expiresAt", { mode: "date", precision: 3 }).notNull(),
    },
    (t) => [
        uniqueIndex("auth_pending_state_uidx").on(t.state),
        index("auth_pending_expires_idx").on(t.expiresAt),
    ],
);

export const authIdentities = pgTable(
    "auth_identities",
    {
        id: id(),
        userId: uuid("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        provider: text("provider").notNull(),
        providerAccountId: text("providerAccountId").notNull(),
        email: text("email"),
        createdAt: ts("createdAt"),
    },
    (t) => [
        uniqueIndex("auth_identities_provider_uidx").on(t.provider, t.providerAccountId),
        uniqueIndex("auth_identities_user_uidx").on(t.userId, t.provider),
        index("auth_identities_user_idx").on(t.userId),
    ],
);

export const emailOtps = pgTable(
    "email_otps",
    {
        id: id(),
        email: text("email").notNull(),
        codeHash: text("codeHash").notNull(),
        purpose: text("purpose").notNull(),
        portal: text("portal").notNull(),
        expiresAt: timestamp("expiresAt", { mode: "date", precision: 3 }).notNull(),
        consumedAt: tsOpt("consumedAt"),
        attempts: integer("attempts").notNull().default(0),
        createdAt: ts("createdAt"),
    },
    (t) => [
        index("email_otps_email_idx").on(t.email),
        index("email_otps_expires_idx").on(t.expiresAt),
    ],
);

export const passkeys = pgTable(
    "passkeys",
    {
        id: id(),
        userId: uuid("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        credentialId: text("credentialId").notNull().unique(),
        publicKey: text("publicKey").notNull(),
        counter: bigint("counter", { mode: "number" }).notNull().default(0),
        transports: jsonb("transports").$type<string[]>().notNull().default([]),
        createdAt: ts("createdAt"),
    },
    (t) => [
        uniqueIndex("passkeys_cred_uidx").on(t.credentialId),
        index("passkeys_user_idx").on(t.userId),
    ],
);

export const rateBuckets = pgTable("rate_buckets", {
    key: text("key").primaryKey(),
    tokens: integer("tokens").notNull(),
    updatedAt: ts("updatedAt"),
});

export const usersRelations = relations(users, ({ many }) => ({
    memberships: many(memberships),
    createdTasks: many(tasks, { relationName: "taskCreator" }),
    assignedTasks: many(tasks, { relationName: "taskAssignee" }),
    taskComments: many(taskComments),
    sentKudos: many(kudos, { relationName: "kudosSender" }),
    receivedKudos: many(kudos, { relationName: "kudosReceiver" }),
    volunteerSignups: many(volunteerSignups),
    createdEvents: many(events, { relationName: "eventCreator" }),
    meetingRsvps: many(meetingRsvps),
    notifications: many(notifications),
    messages: many(messages),
    createdProposals: many(proposals),
    transactions: many(transactions),
    createdTemplates: many(proposalTemplates),
    uploadedLinks: many(linkItems),
    attachments: many(attachments),
    purchaseSubmissions: many(purchaseRequests, { relationName: "purchaseSubmitter" }),
    cooperationSubmissions: many(cooperationRequests, { relationName: "cooperationSubmitter" }),
    createdSubgroups: many(subgroups),
    subgroupMemberships: many(subgroupMemberships),
    showcaseItems: many(showcaseItems),
    sessions: many(sessions),
    authIdentities: many(authIdentities),
    passkeys: many(passkeys),
}));

export const workspacesRelations = relations(workspaces, ({ many }) => ({
    memberships: many(memberships),
    roles: many(roles),
    proposals: many(proposals),
    tasks: many(tasks),
    events: many(events),
    messageThreads: many(messageThreads),
    transactions: many(transactions),
    volunteerSlots: many(volunteerSlots),
    meetings: many(meetings),
    notifications: many(notifications),
    auditLogs: many(auditLogs),
    activityEntries: many(activityFeed),
    kudos: many(kudos),
    attachments: many(attachments),
    linkItems: many(linkItems),
    proposalTemplates: many(proposalTemplates),
    historicalMembers: many(historicalMembers),
    purchaseRequests: many(purchaseRequests),
    cooperationRequests: many(cooperationRequests),
    annualPlans: many(annualEventPlans),
    showcaseItems: many(showcaseItems),
    subgroups: many(subgroups),
    customFieldDefs: many(customFieldDefs),
    workflows: many(workflows),
    approvals: many(approvals),
    savedViews: many(savedViews),
    webhooks: many(webhooks),
    apiTokens: many(apiTokens),
    participationScores: many(participationScores),
    reports: many(reports),
    meetingMinutes: many(meetingMinutes),
    attendance: many(attendance),
    budgetAllocations: many(budgetAllocations),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
    workspace: one(workspaces, { fields: [roles.workspaceId], references: [workspaces.id] }),
    memberships: many(memberships),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
    user: one(users, { fields: [memberships.userId], references: [users.id] }),
    workspace: one(workspaces, { fields: [memberships.workspaceId], references: [workspaces.id] }),
    role: one(roles, { fields: [memberships.roleId], references: [roles.id] }),
}));

export const subgroupsRelations = relations(subgroups, ({ one, many }) => ({
    workspace: one(workspaces, { fields: [subgroups.workspaceId], references: [workspaces.id] }),
    createdBy: one(users, { fields: [subgroups.createdById], references: [users.id] }),
    members: many(subgroupMemberships),
    tasks: many(tasks),
    threads: many(messageThreads),
}));

export const subgroupMembershipsRelations = relations(subgroupMemberships, ({ one }) => ({
    subgroup: one(subgroups, {
        fields: [subgroupMemberships.subgroupId],
        references: [subgroups.id],
    }),
    user: one(users, { fields: [subgroupMemberships.userId], references: [users.id] }),
}));

export const proposalsRelations = relations(proposals, ({ one }) => ({
    workspace: one(workspaces, { fields: [proposals.workspaceId], references: [workspaces.id] }),
    createdBy: one(users, { fields: [proposals.createdById], references: [users.id] }),
}));

export const proposalTemplatesRelations = relations(proposalTemplates, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [proposalTemplates.workspaceId],
        references: [workspaces.id],
    }),
    createdBy: one(users, { fields: [proposalTemplates.createdById], references: [users.id] }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
    workspace: one(workspaces, { fields: [tasks.workspaceId], references: [workspaces.id] }),
    createdBy: one(users, {
        fields: [tasks.createdById],
        references: [users.id],
        relationName: "taskCreator",
    }),
    assignee: one(users, {
        fields: [tasks.assigneeId],
        references: [users.id],
        relationName: "taskAssignee",
    }),
    subgroup: one(subgroups, { fields: [tasks.subgroupId], references: [subgroups.id] }),
    subtasks: many(subTasks),
    comments: many(taskComments),
}));

export const subTasksRelations = relations(subTasks, ({ one }) => ({
    task: one(tasks, { fields: [subTasks.taskId], references: [tasks.id] }),
}));

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
    task: one(tasks, { fields: [taskComments.taskId], references: [tasks.id] }),
    user: one(users, { fields: [taskComments.userId], references: [users.id] }),
}));

export const annualEventPlansRelations = relations(annualEventPlans, ({ one, many }) => ({
    workspace: one(workspaces, {
        fields: [annualEventPlans.workspaceId],
        references: [workspaces.id],
    }),
    events: many(events),
}));

export const eventsRelations = relations(events, ({ one }) => ({
    workspace: one(workspaces, { fields: [events.workspaceId], references: [workspaces.id] }),
    createdBy: one(users, {
        fields: [events.createdById],
        references: [users.id],
        relationName: "eventCreator",
    }),
    approvedBy: one(users, { fields: [events.approvedById], references: [users.id] }),
    annualPlan: one(annualEventPlans, {
        fields: [events.annualPlanId],
        references: [annualEventPlans.id],
    }),
}));

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
    workspace: one(workspaces, { fields: [meetings.workspaceId], references: [workspaces.id] }),
    rsvps: many(meetingRsvps),
    minutes: many(meetingMinutes),
    attendance: many(attendance),
}));

export const meetingRsvpsRelations = relations(meetingRsvps, ({ one }) => ({
    meeting: one(meetings, { fields: [meetingRsvps.meetingId], references: [meetings.id] }),
    user: one(users, { fields: [meetingRsvps.userId], references: [users.id] }),
}));

export const meetingMinutesRelations = relations(meetingMinutes, ({ one }) => ({
    meeting: one(meetings, { fields: [meetingMinutes.meetingId], references: [meetings.id] }),
    createdBy: one(users, { fields: [meetingMinutes.createdById], references: [users.id] }),
    workspace: one(workspaces, {
        fields: [meetingMinutes.workspaceId],
        references: [workspaces.id],
    }),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
    workspace: one(workspaces, { fields: [attendance.workspaceId], references: [workspaces.id] }),
    meeting: one(meetings, { fields: [attendance.meetingId], references: [meetings.id] }),
    event: one(events, { fields: [attendance.eventId], references: [events.id] }),
    user: one(users, { fields: [attendance.userId], references: [users.id] }),
}));

export const messageThreadsRelations = relations(messageThreads, ({ one, many }) => ({
    workspace: one(workspaces, {
        fields: [messageThreads.workspaceId],
        references: [workspaces.id],
    }),
    subgroup: one(subgroups, { fields: [messageThreads.subgroupId], references: [subgroups.id] }),
    messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
    thread: one(messageThreads, { fields: [messages.threadId], references: [messageThreads.id] }),
    sender: one(users, { fields: [messages.senderId], references: [users.id] }),
    readBy: many(messageReads),
}));

export const messageReadsRelations = relations(messageReads, ({ one }) => ({
    message: one(messages, { fields: [messageReads.messageId], references: [messages.id] }),
    user: one(users, { fields: [messageReads.userId], references: [users.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
    workspace: one(workspaces, { fields: [transactions.workspaceId], references: [workspaces.id] }),
    createdBy: one(users, { fields: [transactions.createdById], references: [users.id] }),
}));

export const budgetAllocationsRelations = relations(budgetAllocations, ({ one, many }) => ({
    workspace: one(workspaces, {
        fields: [budgetAllocations.workspaceId],
        references: [workspaces.id],
    }),
    transactions: many(budgetTransactions),
}));

export const budgetTransactionsRelations = relations(budgetTransactions, ({ one }) => ({
    allocation: one(budgetAllocations, {
        fields: [budgetTransactions.allocationId],
        references: [budgetAllocations.id],
    }),
    decidedBy: one(users, { fields: [budgetTransactions.decidedById], references: [users.id] }),
}));

export const purchaseRequestsRelations = relations(purchaseRequests, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [purchaseRequests.workspaceId],
        references: [workspaces.id],
    }),
    submittedBy: one(users, {
        fields: [purchaseRequests.submittedById],
        references: [users.id],
        relationName: "purchaseSubmitter",
    }),
    reviewedBy: one(users, { fields: [purchaseRequests.reviewedById], references: [users.id] }),
}));

export const cooperationRequestsRelations = relations(cooperationRequests, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [cooperationRequests.workspaceId],
        references: [workspaces.id],
    }),
    submittedBy: one(users, {
        fields: [cooperationRequests.submittedById],
        references: [users.id],
        relationName: "cooperationSubmitter",
    }),
    reviewedBy: one(users, { fields: [cooperationRequests.reviewedById], references: [users.id] }),
}));

export const volunteerSlotsRelations = relations(volunteerSlots, ({ one, many }) => ({
    workspace: one(workspaces, {
        fields: [volunteerSlots.workspaceId],
        references: [workspaces.id],
    }),
    signups: many(volunteerSignups),
}));

export const volunteerSignupsRelations = relations(volunteerSignups, ({ one }) => ({
    slot: one(volunteerSlots, {
        fields: [volunteerSignups.slotId],
        references: [volunteerSlots.id],
    }),
    user: one(users, { fields: [volunteerSignups.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [notifications.workspaceId],
        references: [workspaces.id],
    }),
    user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const notificationPrefsRelations = relations(notificationPrefs, ({ one }) => ({
    user: one(users, { fields: [notificationPrefs.userId], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    workspace: one(workspaces, { fields: [auditLogs.workspaceId], references: [workspaces.id] }),
    user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export const activityFeedRelations = relations(activityFeed, ({ one }) => ({
    workspace: one(workspaces, { fields: [activityFeed.workspaceId], references: [workspaces.id] }),
    user: one(users, { fields: [activityFeed.userId], references: [users.id] }),
}));

export const kudosRelations = relations(kudos, ({ one }) => ({
    workspace: one(workspaces, { fields: [kudos.workspaceId], references: [workspaces.id] }),
    sender: one(users, {
        fields: [kudos.senderId],
        references: [users.id],
        relationName: "kudosSender",
    }),
    receiver: one(users, {
        fields: [kudos.receiverId],
        references: [users.id],
        relationName: "kudosReceiver",
    }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
    workspace: one(workspaces, { fields: [attachments.workspaceId], references: [workspaces.id] }),
    uploadedBy: one(users, { fields: [attachments.uploadedById], references: [users.id] }),
}));

export const linkItemsRelations = relations(linkItems, ({ one }) => ({
    workspace: one(workspaces, { fields: [linkItems.workspaceId], references: [workspaces.id] }),
    uploadedBy: one(users, { fields: [linkItems.uploadedById], references: [users.id] }),
}));

export const historicalMembersRelations = relations(historicalMembers, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [historicalMembers.workspaceId],
        references: [workspaces.id],
    }),
}));

export const showcaseItemsRelations = relations(showcaseItems, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [showcaseItems.workspaceId],
        references: [workspaces.id],
    }),
    createdBy: one(users, { fields: [showcaseItems.createdById], references: [users.id] }),
}));

export const customFieldDefsRelations = relations(customFieldDefs, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [customFieldDefs.workspaceId],
        references: [workspaces.id],
    }),
}));

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
    workspace: one(workspaces, { fields: [workflows.workspaceId], references: [workspaces.id] }),
    approvals: many(approvals),
}));

export const approvalsRelations = relations(approvals, ({ one }) => ({
    workspace: one(workspaces, { fields: [approvals.workspaceId], references: [workspaces.id] }),
    workflow: one(workflows, { fields: [approvals.workflowId], references: [workflows.id] }),
    approver: one(users, { fields: [approvals.approverId], references: [users.id] }),
}));

export const savedViewsRelations = relations(savedViews, ({ one }) => ({
    workspace: one(workspaces, { fields: [savedViews.workspaceId], references: [workspaces.id] }),
    user: one(users, { fields: [savedViews.userId], references: [users.id] }),
}));

export const webhooksRelations = relations(webhooks, ({ one }) => ({
    workspace: one(workspaces, { fields: [webhooks.workspaceId], references: [workspaces.id] }),
}));

export const apiTokensRelations = relations(apiTokens, ({ one }) => ({
    workspace: one(workspaces, { fields: [apiTokens.workspaceId], references: [workspaces.id] }),
    user: one(users, { fields: [apiTokens.userId], references: [users.id] }),
}));

export const participationScoresRelations = relations(participationScores, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [participationScores.workspaceId],
        references: [workspaces.id],
    }),
    user: one(users, { fields: [participationScores.userId], references: [users.id] }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
    workspace: one(workspaces, { fields: [reports.workspaceId], references: [workspaces.id] }),
    createdBy: one(users, { fields: [reports.createdById], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const authIdentitiesRelations = relations(authIdentities, ({ one }) => ({
    user: one(users, { fields: [authIdentities.userId], references: [users.id] }),
}));

export const passkeysRelations = relations(passkeys, ({ one }) => ({
    user: one(users, { fields: [passkeys.userId], references: [users.id] }),
}));

export const eventRsvps = pgTable(
    "event_rsvps",
    {
        id: id(),
        eventId: uuid("eventId")
            .notNull()
            .references(() => events.id, { onDelete: "cascade" }),
        userId: uuid("userId")
            .notNull()
            .references(() => users.id),
        status: text("status").notNull().default("going"),
        createdAt: ts("createdAt"),
    },
    (t) => [
        uniqueIndex("event_rsvps_uidx").on(t.eventId, t.userId),
        index("event_rsvps_event_idx").on(t.eventId),
        index("event_rsvps_user_idx").on(t.userId),
    ],
);

export const polls = pgTable(
    "polls",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        description: text("description"),
        status: text("status").notNull().default("open"),
        multiple: boolean("multiple").notNull().default(false),
        anonymous: boolean("anonymous").notNull().default(false),
        closesAt: tsOpt("closesAt"),
        createdById: uuid("createdById")
            .notNull()
            .references(() => users.id),
        createdAt: ts("createdAt"),
        updatedAt: updatedAt(),
        deletedAt: deletedAt(),
    },
    (t) => [
        index("polls_ws_idx").on(t.workspaceId),
        index("polls_ws_created_idx").on(t.workspaceId, t.createdAt),
    ],
);

export const pollOptions = pgTable(
    "poll_options",
    {
        id: id(),
        pollId: uuid("pollId")
            .notNull()
            .references(() => polls.id, { onDelete: "cascade" }),
        text: text("text").notNull(),
        position: integer("position").notNull().default(0),
    },
    (t) => [index("poll_options_poll_idx").on(t.pollId)],
);

export const pollVotes = pgTable(
    "poll_votes",
    {
        id: id(),
        pollId: uuid("pollId")
            .notNull()
            .references(() => polls.id, { onDelete: "cascade" }),
        optionId: uuid("optionId")
            .notNull()
            .references(() => pollOptions.id, { onDelete: "cascade" }),
        userId: uuid("userId")
            .notNull()
            .references(() => users.id),
        createdAt: ts("createdAt"),
    },
    (t) => [
        uniqueIndex("poll_votes_uidx").on(t.pollId, t.optionId, t.userId),
        index("poll_votes_poll_idx").on(t.pollId),
        index("poll_votes_user_idx").on(t.userId),
    ],
);

export const goals = pgTable(
    "goals",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        description: text("description"),
        ownerId: uuid("ownerId").references(() => users.id),
        status: text("status").notNull().default("active"),
        dueDate: tsOpt("dueDate"),
        createdAt: ts("createdAt"),
        updatedAt: updatedAt(),
        deletedAt: deletedAt(),
    },
    (t) => [
        index("goals_ws_idx").on(t.workspaceId),
        index("goals_ws_created_idx").on(t.workspaceId, t.createdAt),
    ],
);

export const keyResults = pgTable(
    "key_results",
    {
        id: id(),
        goalId: uuid("goalId")
            .notNull()
            .references(() => goals.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        target: integer("target").notNull(),
        current: integer("current").notNull().default(0),
        unit: text("unit").notNull().default(""),
        position: integer("position").notNull().default(0),
    },
    (t) => [index("key_results_goal_idx").on(t.goalId)],
);

export const memberDues = pgTable(
    "member_dues",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        userId: uuid("userId")
            .notNull()
            .references(() => users.id),
        title: text("title").notNull(),
        amountCents: bigint("amountCents", { mode: "number" }).notNull(),
        dueDate: tsOpt("dueDate"),
        status: text("status").notNull().default("unpaid"),
        paidAt: tsOpt("paidAt"),
        createdAt: ts("createdAt"),
    },
    (t) => [
        index("member_dues_ws_idx").on(t.workspaceId),
        index("member_dues_user_idx").on(t.workspaceId, t.userId),
        index("member_dues_ws_created_idx").on(t.workspaceId, t.createdAt),
    ],
);

export const assets = pgTable(
    "assets",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        description: text("description"),
        quantity: integer("quantity").notNull().default(1),
        condition: text("condition").notNull().default("good"),
        createdAt: ts("createdAt"),
        deletedAt: deletedAt(),
    },
    (t) => [index("assets_ws_idx").on(t.workspaceId)],
);

export const assetLoans = pgTable(
    "asset_loans",
    {
        id: id(),
        assetId: uuid("assetId")
            .notNull()
            .references(() => assets.id, { onDelete: "cascade" }),
        userId: uuid("userId")
            .notNull()
            .references(() => users.id),
        quantity: integer("quantity").notNull().default(1),
        borrowedAt: ts("borrowedAt"),
        dueAt: tsOpt("dueAt"),
        returnedAt: tsOpt("returnedAt"),
        status: text("status").notNull().default("out"),
    },
    (t) => [
        index("asset_loans_asset_idx").on(t.assetId),
        index("asset_loans_user_idx").on(t.userId),
    ],
);

export const decisions = pgTable(
    "decisions",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        summary: text("summary").notNull(),
        entityType: text("entityType"),
        entityId: text("entityId"),
        decidedById: uuid("decidedById").references(() => users.id),
        decidedAt: ts("decidedAt"),
        createdAt: ts("createdAt"),
    },
    (t) => [
        index("decisions_ws_idx").on(t.workspaceId),
        index("decisions_ws_created_idx").on(t.workspaceId, t.createdAt),
    ],
);

export const taskTimeEntries = pgTable(
    "task_time_entries",
    {
        id: id(),
        taskId: uuid("taskId")
            .notNull()
            .references(() => tasks.id, { onDelete: "cascade" }),
        userId: uuid("userId")
            .notNull()
            .references(() => users.id),
        minutes: integer("minutes").notNull(),
        note: text("note"),
        date: ts("date"),
        createdAt: ts("createdAt"),
    },
    (t) => [index("task_time_task_idx").on(t.taskId), index("task_time_user_idx").on(t.userId)],
);

export const reactions = pgTable(
    "reactions",
    {
        id: id(),
        workspaceId: uuid("workspaceId")
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        entityType: text("entityType").notNull(),
        entityId: text("entityId").notNull(),
        userId: uuid("userId")
            .notNull()
            .references(() => users.id),
        emoji: varchar("emoji", { length: 16 }).notNull(),
        createdAt: ts("createdAt"),
    },
    (t) => [
        uniqueIndex("reactions_uidx").on(t.entityType, t.entityId, t.userId, t.emoji),
        index("reactions_entity_idx").on(t.entityType, t.entityId),
    ],
);

export const attachmentVersions = pgTable(
    "attachment_versions",
    {
        id: id(),
        attachmentId: uuid("attachmentId")
            .notNull()
            .references(() => attachments.id, { onDelete: "cascade" }),
        version: integer("version").notNull(),
        storagePath: text("storagePath").notNull(),
        fileSize: integer("fileSize").notNull(),
        sha256: text("sha256"),
        createdById: uuid("createdById").references(() => users.id),
        createdAt: ts("createdAt"),
    },
    (t) => [index("attachment_versions_att_idx").on(t.attachmentId)],
);

export const agendaItems = pgTable(
    "agenda_items",
    {
        id: id(),
        meetingId: uuid("meetingId")
            .notNull()
            .references(() => meetings.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        description: text("description"),
        position: integer("position").notNull().default(0),
        status: text("status").notNull().default("open"),
        createdAt: ts("createdAt"),
    },
    (t) => [index("agenda_items_meeting_idx").on(t.meetingId)],
);

export const eventRsvpsRelations = relations(eventRsvps, ({ one }) => ({
    event: one(events, { fields: [eventRsvps.eventId], references: [events.id] }),
    user: one(users, { fields: [eventRsvps.userId], references: [users.id] }),
}));

export const pollsRelations = relations(polls, ({ one, many }) => ({
    workspace: one(workspaces, { fields: [polls.workspaceId], references: [workspaces.id] }),
    createdBy: one(users, { fields: [polls.createdById], references: [users.id] }),
    options: many(pollOptions),
    votes: many(pollVotes),
}));

export const pollOptionsRelations = relations(pollOptions, ({ one, many }) => ({
    poll: one(polls, { fields: [pollOptions.pollId], references: [polls.id] }),
    votes: many(pollVotes),
}));

export const pollVotesRelations = relations(pollVotes, ({ one }) => ({
    poll: one(polls, { fields: [pollVotes.pollId], references: [polls.id] }),
    option: one(pollOptions, { fields: [pollVotes.optionId], references: [pollOptions.id] }),
    user: one(users, { fields: [pollVotes.userId], references: [users.id] }),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
    workspace: one(workspaces, { fields: [goals.workspaceId], references: [workspaces.id] }),
    owner: one(users, { fields: [goals.ownerId], references: [users.id] }),
    keyResults: many(keyResults),
}));

export const keyResultsRelations = relations(keyResults, ({ one }) => ({
    goal: one(goals, { fields: [keyResults.goalId], references: [goals.id] }),
}));

export const memberDuesRelations = relations(memberDues, ({ one }) => ({
    workspace: one(workspaces, { fields: [memberDues.workspaceId], references: [workspaces.id] }),
    user: one(users, { fields: [memberDues.userId], references: [users.id] }),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
    workspace: one(workspaces, { fields: [assets.workspaceId], references: [workspaces.id] }),
    loans: many(assetLoans),
}));

export const assetLoansRelations = relations(assetLoans, ({ one }) => ({
    asset: one(assets, { fields: [assetLoans.assetId], references: [assets.id] }),
    user: one(users, { fields: [assetLoans.userId], references: [users.id] }),
}));

export const decisionsRelations = relations(decisions, ({ one }) => ({
    workspace: one(workspaces, { fields: [decisions.workspaceId], references: [workspaces.id] }),
    decidedBy: one(users, { fields: [decisions.decidedById], references: [users.id] }),
}));

export const taskTimeEntriesRelations = relations(taskTimeEntries, ({ one }) => ({
    task: one(tasks, { fields: [taskTimeEntries.taskId], references: [tasks.id] }),
    user: one(users, { fields: [taskTimeEntries.userId], references: [users.id] }),
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
    workspace: one(workspaces, { fields: [reactions.workspaceId], references: [workspaces.id] }),
    user: one(users, { fields: [reactions.userId], references: [users.id] }),
}));

export const attachmentVersionsRelations = relations(attachmentVersions, ({ one }) => ({
    attachment: one(attachments, {
        fields: [attachmentVersions.attachmentId],
        references: [attachments.id],
    }),
    createdBy: one(users, { fields: [attachmentVersions.createdById], references: [users.id] }),
}));

export const agendaItemsRelations = relations(agendaItems, ({ one }) => ({
    meeting: one(meetings, { fields: [agendaItems.meetingId], references: [meetings.id] }),
}));

export type Workspace = typeof workspaces.$inferSelect;
export type User = typeof users.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type DbSession = typeof sessions.$inferSelect;
