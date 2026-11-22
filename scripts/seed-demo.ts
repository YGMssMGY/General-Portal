import { createHash } from "node:crypto";
import { asc, eq, inArray } from "drizzle-orm";
import { closeAllPools, getDb, normalizeSlug } from "../src/db/client";
import {
    assetLoans,
    assets,
    attachments,
    budgetAllocations,
    budgetTransactions,
    cooperationRequests,
    customFieldDefs,
    decisions,
    events,
    goals,
    keyResults,
    kudos,
    meetingRsvps,
    meetings,
    memberDues,
    memberships,
    messageThreads,
    messages,
    notifications,
    pollOptions,
    pollVotes,
    polls,
    proposals,
    purchaseRequests,
    reactions,
    roles,
    showcaseItems,
    subgroupMemberships,
    subgroups,
    tasks,
    transactions,
    users,
    volunteerSignups,
    volunteerSlots,
    workspaces,
} from "../src/db/schema";

interface TaskSeed {
    title: string;
    description: string;
    status: "todo" | "in_progress" | "done";
    priority: number;
    dueDays: number;
    recurrence?: string;
}

interface DemoData {
    subgroups: string[];
    tasks: TaskSeed[];
    events: Array<{ title: string; description: string; days: number; location: string }>;
    proposals: Array<{
        title: string;
        description: string;
        status: "pending" | "approved" | "rejected";
    }>;
    transactions: Array<{
        description: string;
        amountCents: number;
        type: "income" | "expense";
        category: string;
        days: number;
    }>;
    budgets: Array<{
        category: string;
        amountCents: number;
        spentCents: number;
        description: string;
    }>;
    meetings: Array<{
        title: string;
        description: string;
        days: number;
        location: string;
        status: "scheduled" | "completed" | "ongoing";
    }>;
    volunteers: Array<{ title: string; description: string; days: number }>;
    threads: Array<{ subject: string; messages: string[] }>;
    kudos: string[];
    polls: Array<{ title: string; description: string; options: string[] }>;
    goals: Array<{
        title: string;
        description: string;
        keyResults: Array<{ title: string; target: number; current: number; unit: string }>;
    }>;
    dues: Array<{ title: string; amountCents: number; status: string }>;
    assets: Array<{ name: string; description: string; quantity: number; condition: string }>;
    decisions: Array<{ title: string; summary: string }>;
    cooperation: Array<{
        clubName: string;
        contactName: string;
        contactEmail: string;
        eventTitle: string;
        description: string;
        resourcesNeeded: string;
        status: string;
    }>;
    purchases: Array<{
        title: string;
        itemName: string;
        costCents: number;
        justification: string;
        status: "submitted" | "under_review" | "approved" | "fulfilled";
    }>;
    showcases: Array<{ type: string; title: string; description: string; linkUrl: string }>;
    notifications: Array<{ title: string; body: string; type: string }>;
    customFields: Array<{
        entityType: string;
        key: string;
        label: string;
        fieldType: string;
        options?: string[];
    }>;
}

const PEOPLE = [
    { key: "amelia", name: "Amelia Hart", role: "officer" },
    { key: "noah", name: "Noah Bennett", role: "member" },
    { key: "priya", name: "Priya Raman", role: "officer" },
    { key: "lukas", name: "Lukas Meyer", role: "member" },
    { key: "sofia", name: "Sofia Duarte", role: "member" },
    { key: "ethan", name: "Ethan Cole", role: "officer" },
];

const DEVELOPERS_DATA: DemoData = {
    subgroups: ["Developer Community", "Events Working Group"],
    tasks: [
        {
            title: "Autumn Recruitment Drive",
            description: "Coordinate outreach and onboarding for the autumn cohort.",
            status: "in_progress",
            priority: 2,
            dueDays: 14,
            recurrence: "weekly",
        },
        {
            title: "Q3 Budget Review",
            description: "Reconcile third-quarter spend and prepare the finance summary.",
            status: "todo",
            priority: 1,
            dueDays: 7,
        },
        {
            title: "Alumni Mentoring Kickoff",
            description: "Pair returning alumni mentors with new members.",
            status: "done",
            priority: 0,
            dueDays: -10,
        },
        {
            title: "Publish Developer Newsletter",
            description: "Draft, review, and publish the monthly newsletter.",
            status: "todo",
            priority: 0,
            dueDays: 21,
            recurrence: "monthly",
        },
        {
            title: "Maintain Component Library",
            description: "Triage open issues in the shared component library.",
            status: "in_progress",
            priority: 1,
            dueDays: 30,
        },
    ],
    events: [
        {
            title: "Developer Demo Day",
            description: "Teams present projects to the community and guest reviewers.",
            days: 21,
            location: "Main Auditorium",
        },
        {
            title: "Open Source Workshop",
            description: "Hands-on session covering contributions to public repositories.",
            days: 45,
            location: "Lab B",
        },
        {
            title: "Community Standup",
            description: "Monthly update on ongoing initiatives and open questions.",
            days: -7,
            location: "Online",
        },
        {
            title: "Career Fair Preparation",
            description: "Prepare materials and logistics for the spring career fair.",
            days: 60,
            location: "Student Center",
        },
    ],
    proposals: [
        {
            title: "Fund Hackathon Venue",
            description: "Allocate funds to reserve the venue for the autumn hackathon.",
            status: "approved",
        },
        {
            title: "Adopt Design System Guidelines",
            description: "Standardize interface guidelines across member projects.",
            status: "pending",
        },
        {
            title: "Reduce Annual Membership Fee",
            description: "Lower the yearly fee to improve accessibility.",
            status: "rejected",
        },
    ],
    transactions: [
        {
            description: "Membership dues collected",
            amountCents: 125000,
            type: "income",
            category: "Dues",
            days: -5,
        },
        {
            description: "Venue rental for demo day",
            amountCents: 45000,
            type: "expense",
            category: "Events",
            days: -12,
        },
        {
            description: "Corporate sponsor grant",
            amountCents: 200000,
            type: "income",
            category: "Sponsorship",
            days: -30,
        },
        {
            description: "Software license renewal",
            amountCents: 18000,
            type: "expense",
            category: "Operations",
            days: -20,
        },
    ],
    budgets: [
        {
            category: "Events",
            amountCents: 500000,
            spentCents: 145000,
            description: "Venues, catering, and event supplies.",
        },
        {
            category: "Operations",
            amountCents: 200000,
            spentCents: 18000,
            description: "Software, stationery, and routine costs.",
        },
        {
            category: "Outreach",
            amountCents: 150000,
            spentCents: 0,
            description: "Recruitment campaigns and printed materials.",
        },
    ],
    meetings: [
        {
            title: "Weekly Planning Sync",
            description: "Review active tasks and unblock pending work.",
            days: 2,
            location: "Room 204",
            status: "scheduled",
        },
        {
            title: "Quarterly Review",
            description: "Retrospective on the previous quarter and goal setting.",
            days: -14,
            location: "Board Room",
            status: "completed",
        },
        {
            title: "Budget Committee",
            description: "Review allocation requests and spending reports.",
            days: 7,
            location: "Online",
            status: "scheduled",
        },
    ],
    volunteers: [
        {
            title: "Demo Day Setup Crew",
            description: "Assemble signage, seating, and presentation equipment.",
            days: 21,
        },
        {
            title: "Workshop Facilitator",
            description: "Guide participants through the open source workshop.",
            days: 45,
        },
    ],
    threads: [
        {
            subject: "Demo Day coordination",
            messages: [
                "Venue confirmation is in progress.",
                "I can handle the signage and wayfinding.",
                "Please share the final schedule by Friday.",
            ],
        },
        {
            subject: "Mentoring program feedback",
            messages: [
                "We received twenty-four mentor applications.",
                "Let us schedule the matching review this week.",
            ],
        },
    ],
    kudos: [
        "Excellent work coordinating the recruitment drive.",
        "Thanks for stepping in on the budget review.",
        "Great facilitation during the open source workshop.",
    ],
    polls: [
        {
            title: "Next demo day format",
            description: "Choose the format for the next community demo day.",
            options: ["In person", "Hybrid", "Online"],
        },
        {
            title: "Preferred workshop topic",
            description: "Help us plan the next technical workshop.",
            options: ["Testing", "Accessibility", "Continuous integration"],
        },
    ],
    goals: [
        {
            title: "Grow active membership",
            description: "Increase the number of members participating each term.",
            keyResults: [
                { title: "Recruit new members", target: 60, current: 38, unit: "members" },
                { title: "Retention rate", target: 80, current: 72, unit: "percent" },
            ],
        },
        {
            title: "Improve event quality",
            description: "Deliver well-attended and well-reviewed events.",
            keyResults: [
                { title: "Events delivered", target: 8, current: 5, unit: "events" },
                { title: "Average attendance", target: 100, current: 84, unit: "attendees" },
            ],
        },
    ],
    dues: [
        { title: "Annual membership fee 2026", amountCents: 2500, status: "unpaid" },
        { title: "Workshop materials fee", amountCents: 1200, status: "paid" },
    ],
    assets: [
        {
            name: "Portable projector",
            description: "HD projector with carry case",
            quantity: 2,
            condition: "good",
        },
        {
            name: "Folding tables",
            description: "Six lightweight tables",
            quantity: 6,
            condition: "fair",
        },
    ],
    decisions: [
        {
            title: "Adopt hybrid demo day format",
            summary: "Council approved a hybrid format for the autumn demo day.",
        },
        {
            title: "Approve third-quarter event budget",
            summary: "The event allocation was approved with a ten percent contingency.",
        },
    ],
    cooperation: [
        {
            clubName: "Robotics Club",
            contactName: "Nora Blake",
            contactEmail: "nora.blake@example.test",
            eventTitle: "Joint Robotics Showcase",
            description: "Collaborate on a shared showcase afternoon for both communities.",
            resourcesNeeded: "Projector and two tables",
            status: "approved",
        },
    ],
    purchases: [
        {
            title: "Purchase poster printer",
            itemName: "Poster printer",
            costCents: 45000,
            justification: "Needed for recruitment campaigns and event signage.",
            status: "approved",
        },
        {
            title: "Order workshop supplies",
            itemName: "Marker sets",
            costCents: 8000,
            justification: "Consumables for the open source workshop.",
            status: "submitted",
        },
    ],
    showcases: [
        {
            type: "project",
            title: "Open Source Toolkit",
            description: "A shared toolkit for student developers.",
            linkUrl: "https://example.test/toolkit",
        },
        {
            type: "event",
            title: "Demo Day Archive",
            description: "Recordings and slides from past demo days.",
            linkUrl: "https://example.test/demo-day",
        },
    ],
    notifications: [
        {
            title: "Task assigned to you",
            body: "Autumn Recruitment Drive is now assigned to you.",
            type: "task",
        },
        { title: "Event published", body: "Developer Demo Day is now published.", type: "event" },
        {
            title: "New kudos received",
            body: "You received kudos from a fellow member.",
            type: "kudos",
        },
    ],
    customFields: [
        {
            entityType: "tasks",
            key: "effort",
            label: "Effort estimate",
            fieldType: "select",
            options: ["small", "medium", "large"],
        },
        {
            entityType: "events",
            key: "audience",
            label: "Target audience",
            fieldType: "select",
            options: ["members", "public"],
        },
    ],
};

const STUCO_DATA: DemoData = {
    subgroups: ["Student Council", "Community Outreach"],
    tasks: [
        {
            title: "Autumn Recruitment Drive",
            description: "Recruit new student council representatives for the autumn term.",
            status: "in_progress",
            priority: 2,
            dueDays: 14,
            recurrence: "weekly",
        },
        {
            title: "Q3 Budget Review",
            description: "Review third-quarter expenses and prepare the finance report.",
            status: "todo",
            priority: 1,
            dueDays: 7,
        },
        {
            title: "Alumni Mentoring Kickoff",
            description: "Launch the alumni mentoring programme for graduating students.",
            status: "done",
            priority: 0,
            dueDays: -10,
        },
        {
            title: "Parent Teacher Conference Prep",
            description: "Prepare the council presentation for the autumn conference.",
            status: "todo",
            priority: 0,
            dueDays: 21,
            recurrence: "monthly",
        },
        {
            title: "Update Student Handbook",
            description: "Revise the handbook with the latest policies and contacts.",
            status: "in_progress",
            priority: 1,
            dueDays: 30,
        },
    ],
    events: [
        {
            title: "Autumn Fair",
            description: "Annual fair with clubs, food stalls, and student performances.",
            days: 21,
            location: "School Grounds",
        },
        {
            title: "Alumni Mentoring Kickoff",
            description: "Introduce students to alumni mentors and programme expectations.",
            days: 35,
            location: "Main Hall",
        },
        {
            title: "Council Open Forum",
            description: "Open question session with the student council.",
            days: -7,
            location: "Council Room",
        },
        {
            title: "Winter Dance Planning",
            description: "Initial planning meeting for the winter dance.",
            days: 60,
            location: "Student Center",
        },
    ],
    proposals: [
        {
            title: "Fund Student Lounge Renovation",
            description: "Allocate funds to refresh the student lounge furniture.",
            status: "approved",
        },
        {
            title: "Extend Library Hours",
            description: "Propose longer evening library opening times during exams.",
            status: "pending",
        },
        {
            title: "Reduce Event Fees",
            description: "Lower participation fees for school events.",
            status: "rejected",
        },
    ],
    transactions: [
        {
            description: "Student activity fees",
            amountCents: 240000,
            type: "income",
            category: "Fees",
            days: -5,
        },
        {
            description: "Autumn Fair supplies",
            amountCents: 32000,
            type: "expense",
            category: "Events",
            days: -12,
        },
        {
            description: "Alumni association donation",
            amountCents: 150000,
            type: "income",
            category: "Donations",
            days: -30,
        },
        {
            description: "Printing and stationery",
            amountCents: 9500,
            type: "expense",
            category: "Operations",
            days: -20,
        },
    ],
    budgets: [
        {
            category: "Events",
            amountCents: 400000,
            spentCents: 120000,
            description: "School fairs, performances, and celebrations.",
        },
        {
            category: "Outreach",
            amountCents: 180000,
            spentCents: 22000,
            description: "Recruitment and community engagement.",
        },
        {
            category: "Operations",
            amountCents: 120000,
            spentCents: 120000,
            description: "Office supplies and administrative costs.",
        },
    ],
    meetings: [
        {
            title: "Council Weekly Meeting",
            description: "Weekly coordination of council activities and tasks.",
            days: 2,
            location: "Council Room",
            status: "scheduled",
        },
        {
            title: "Semester Review",
            description: "Review semester outcomes and elect new officers.",
            days: -14,
            location: "Hall A",
            status: "completed",
        },
        {
            title: "Finance Subcommittee",
            description: "Examine budget requests and spending reports.",
            days: 7,
            location: "Online",
            status: "scheduled",
        },
    ],
    volunteers: [
        {
            title: "Autumn Fair Setup",
            description: "Set up stalls, banners, and seating before the fair.",
            days: 21,
        },
        {
            title: "Open Forum Greeter",
            description: "Welcome attendees and manage the question queue.",
            days: 10,
        },
    ],
    threads: [
        {
            subject: "Autumn Fair planning",
            messages: [
                "The stall allocation list is ready for review.",
                "We still need two volunteers for the entrance.",
                "I will confirm the sound system tomorrow.",
            ],
        },
        {
            subject: "Mentoring programme rollout",
            messages: [
                "Mentor matching begins next Monday.",
                "Please review the consent form before then.",
            ],
        },
    ],
    kudos: [
        "Thank you for leading the autumn recruitment drive.",
        "Appreciate the careful work on the budget review.",
        "Wonderful support during the alumni mentoring kickoff.",
    ],
    polls: [
        {
            title: "Autumn Fair activity",
            description: "Choose the main activity for the autumn fair.",
            options: ["Live music", "Skill workshops", "Sports tournament"],
        },
        {
            title: "Mentoring kickoff date",
            description: "Pick a suitable date for the mentoring kickoff.",
            options: ["Monday", "Wednesday", "Friday"],
        },
    ],
    goals: [
        {
            title: "Increase student participation",
            description: "Get more students involved in council activities.",
            keyResults: [
                { title: "Active participants", target: 120, current: 76, unit: "students" },
                { title: "Event attendance", target: 200, current: 148, unit: "attendees" },
            ],
        },
        {
            title: "Improve council transparency",
            description: "Publish clearer updates on decisions and spending.",
            keyResults: [
                { title: "Minutes published", target: 10, current: 7, unit: "documents" },
                { title: "Open forums held", target: 4, current: 2, unit: "sessions" },
            ],
        },
    ],
    dues: [
        { title: "Annual student activity fee", amountCents: 2000, status: "unpaid" },
        { title: "Autumn Fair contribution", amountCents: 800, status: "paid" },
    ],
    assets: [
        {
            name: "Folding chairs",
            description: "Twenty stacked chairs for events",
            quantity: 20,
            condition: "good",
        },
        {
            name: "Portable speaker",
            description: "Battery speaker with microphone",
            quantity: 1,
            condition: "good",
        },
    ],
    decisions: [
        {
            title: "Approve autumn fair budget",
            summary: "Council approved the autumn fair budget with a small contingency.",
        },
        {
            title: "Adopt mentoring programme charter",
            summary: "The mentoring programme charter was adopted for the academic year.",
        },
    ],
    cooperation: [
        {
            clubName: "Debate Club",
            contactName: "Hannah Reed",
            contactEmail: "hannah.reed@example.test",
            eventTitle: "Joint Public Speaking Night",
            description: "Partner on a public speaking event for students.",
            resourcesNeeded: "Main hall and audio equipment",
            status: "pending",
        },
    ],
    purchases: [
        {
            title: "Purchase fair banner",
            itemName: "Printed banner",
            costCents: 22000,
            justification: "Needed for the autumn fair and recruitment events.",
            status: "under_review",
        },
        {
            title: "Order name badges",
            itemName: "Name badges",
            costCents: 6000,
            justification: "For council representatives at open forums.",
            status: "fulfilled",
        },
    ],
    showcases: [
        {
            type: "initiative",
            title: "Peer Mentoring Programme",
            description: "Connecting students with alumni mentors each term.",
            linkUrl: "https://example.test/mentoring",
        },
        {
            type: "event",
            title: "Autumn Fair Highlights",
            description: "Photos and highlights from the latest autumn fair.",
            linkUrl: "https://example.test/autumn-fair",
        },
    ],
    notifications: [
        {
            title: "Task assigned to you",
            body: "Autumn Recruitment Drive is now assigned to you.",
            type: "task",
        },
        { title: "Event published", body: "Autumn Fair is now published.", type: "event" },
        {
            title: "New kudos received",
            body: "You received kudos from a fellow student.",
            type: "kudos",
        },
    ],
    customFields: [
        {
            entityType: "tasks",
            key: "effort",
            label: "Effort estimate",
            fieldType: "select",
            options: ["small", "medium", "large"],
        },
        {
            entityType: "events",
            key: "audience",
            label: "Target audience",
            fieldType: "select",
            options: ["students", "public"],
        },
    ],
};

function demoId(slug: string, kind: string, index: string | number): string {
    const hex = createHash("sha256").update(`${slug}:${kind}:${index}`).digest("hex").slice(0, 32);
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function at(days: number, hour = 9): Date {
    const date = new Date(Date.now() + days * 86400000);
    date.setUTCHours(hour, 0, 0, 0);
    return date;
}

async function seedPortal(slug: string): Promise<Record<string, number>> {
    const db = getDb(slug);
    const counts: Record<string, number> = {};
    const sid = (kind: string, index: string | number): string => demoId(slug, kind, index);

    const [workspace] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.slug, slug))
        .limit(1);
    if (!workspace) throw new Error(`workspace "${slug}" not found`);
    const workspaceId = workspace.id;

    const [firstMember] = await db
        .select({ userId: memberships.userId })
        .from(memberships)
        .where(eq(memberships.workspaceId, workspaceId))
        .orderBy(asc(memberships.createdAt))
        .limit(1);
    if (!firstMember) throw new Error(`no members found in workspace "${slug}"`);
    const adminId = firstMember.userId;

    const data = slug === "stuco" ? STUCO_DATA : DEVELOPERS_DATA;
    const year = new Date().getUTCFullYear();
    const emails = PEOPLE.map((person) => `demo.${slug}.${person.key}@example.test`);

    const userRows: (typeof users.$inferInsert)[] = PEOPLE.map((person, i) => ({
        id: sid("user", i),
        name: person.name,
        email: emails[i],
        locale: "en-US",
        timezone: "UTC",
    }));
    counts.users = userRows.length
        ? (await db.insert(users).values(userRows).onConflictDoNothing().returning()).length
        : 0;

    const emailRows = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(inArray(users.email, emails));
    const byEmail = new Map(emailRows.map((row) => [row.email, row.id]));
    const memberIds = emails
        .map((email) => byEmail.get(email))
        .filter((id): id is string => typeof id === "string");
    const people = [adminId, ...memberIds];

    const roleRows = await db
        .select({ id: roles.id, name: roles.name })
        .from(roles)
        .where(eq(roles.workspaceId, workspaceId));
    const roleIds = new Map(roleRows.map((row) => [row.name, row.id]));

    const membershipRows: (typeof memberships.$inferInsert)[] = PEOPLE.map((person, i) => ({
        id: sid("membership", i),
        userId: byEmail.get(emails[i]) ?? sid("user", i),
        workspaceId,
        roleId: roleIds.get(person.role) ?? null,
    }));
    counts.memberships = (
        await db.insert(memberships).values(membershipRows).onConflictDoNothing().returning()
    ).length;

    const subgroupRows: (typeof subgroups.$inferInsert)[] = data.subgroups.map((name, i) => ({
        id: sid("subgroup", i),
        workspaceId,
        name,
        description: `Coordinates ${name.toLowerCase()} activities for the portal.`,
        color: i === 0 ? "#0f62fe" : "#7040b0",
        createdById: adminId,
    }));
    counts.subgroups = (
        await db.insert(subgroups).values(subgroupRows).onConflictDoNothing().returning()
    ).length;

    const subgroupMemberRows: (typeof subgroupMemberships.$inferInsert)[] = subgroupRows.flatMap(
        (_subgroup, sgIndex) =>
            people.slice(0, 3).map((userId, userIndex) => ({
                id: sid("subgroupMember", `${sgIndex}:${userIndex}`),
                subgroupId: sid("subgroup", sgIndex),
                userId,
                joinedAt: at(-30 + userIndex),
            })),
    );
    counts.subgroupMemberships = (
        await db
            .insert(subgroupMemberships)
            .values(subgroupMemberRows)
            .onConflictDoNothing()
            .returning()
    ).length;

    const meetingRows: (typeof meetings.$inferInsert)[] = data.meetings.map((meeting, i) => ({
        id: sid("meeting", i),
        workspaceId,
        title: meeting.title,
        description: meeting.description,
        startTime: at(meeting.days, 10),
        endTime: at(meeting.days, 11),
        location: meeting.location,
        status: meeting.status,
        checkInCode: `DEMO${i}${year}`,
    }));
    counts.meetings = (
        await db.insert(meetings).values(meetingRows).onConflictDoNothing().returning()
    ).length;

    const rsvpRows: (typeof meetingRsvps.$inferInsert)[] = meetingRows.flatMap((_meeting, mIndex) =>
        people.slice(0, 3).map((userId, userIndex) => ({
            id: sid("meetingRsvp", `${mIndex}:${userIndex}`),
            meetingId: sid("meeting", mIndex),
            userId,
            status: userIndex % 3 === 0 ? "going" : "maybe",
        })),
    );
    counts.meetingRsvps = (
        await db.insert(meetingRsvps).values(rsvpRows).onConflictDoNothing().returning()
    ).length;

    const taskRows: (typeof tasks.$inferInsert)[] = data.tasks.map((task, i) => ({
        id: sid("task", i),
        workspaceId,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: at(task.dueDays, 17),
        createdById: adminId,
        assigneeId: people[i % people.length],
        subgroupId: sid("subgroup", i % subgroupRows.length),
        meetingId: sid("meeting", 0),
        dependsOnId: i === 2 ? sid("task", 0) : null,
        recurrence: task.recurrence ?? null,
    }));
    counts.tasks = (
        await db.insert(tasks).values(taskRows).onConflictDoNothing().returning()
    ).length;

    const eventRows: (typeof events.$inferInsert)[] = data.events.map((event, i) => ({
        id: sid("event", i),
        workspaceId,
        title: event.title,
        description: event.description,
        startDate: at(event.days, 9),
        endDate: at(event.days, 17),
        location: event.location,
        isPublic: i % 2 === 0,
        status: "published",
        approvalStatus: "approved",
        approvedById: adminId,
        approvedAt: at(event.days - 2),
        createdById: adminId,
    }));
    counts.events = (
        await db.insert(events).values(eventRows).onConflictDoNothing().returning()
    ).length;

    const proposalRows: (typeof proposals.$inferInsert)[] = data.proposals.map((proposal, i) => ({
        id: sid("proposal", i),
        workspaceId,
        title: proposal.title,
        description: proposal.description,
        status: proposal.status,
        createdById: adminId,
        createdAt: at(-20 + i),
    }));
    counts.proposals = (
        await db.insert(proposals).values(proposalRows).onConflictDoNothing().returning()
    ).length;

    const transactionRows: (typeof transactions.$inferInsert)[] = data.transactions.map(
        (tx, i) => ({
            id: sid("transaction", i),
            workspaceId,
            amountCents: tx.amountCents,
            amount: Math.round(tx.amountCents / 100),
            type: tx.type,
            category: tx.category,
            description: tx.description,
            date: at(tx.days),
            createdById: adminId,
        }),
    );
    counts.transactions = (
        await db.insert(transactions).values(transactionRows).onConflictDoNothing().returning()
    ).length;

    const budgetRows: (typeof budgetAllocations.$inferInsert)[] = data.budgets.map((budget, i) => ({
        id: sid("budget", i),
        workspaceId,
        category: budget.category,
        amountCents: budget.amountCents,
        spentCents: budget.spentCents,
        fiscalYear: year,
        status: budget.spentCents >= budget.amountCents ? "spent" : "active",
        description: budget.description,
    }));
    counts.budgetAllocations = (
        await db.insert(budgetAllocations).values(budgetRows).onConflictDoNothing().returning()
    ).length;

    const budgetSpendRows: (typeof budgetTransactions.$inferInsert)[] = data.budgets.flatMap(
        (budget, i) => {
            if (budget.spentCents <= 0) return [];
            const first = Math.floor(budget.spentCents / 2);
            return [
                {
                    id: sid("budgetSpend", `${i}:0`),
                    allocationId: sid("budget", i),
                    amountCents: first,
                    type: "expense" as const,
                    description: `${budget.category} supplies`,
                    decidedById: adminId,
                },
                {
                    id: sid("budgetSpend", `${i}:1`),
                    allocationId: sid("budget", i),
                    amountCents: budget.spentCents - first,
                    type: "expense" as const,
                    description: `${budget.category} services`,
                    decidedById: adminId,
                },
            ];
        },
    );
    counts.budgetTransactions = (
        await db
            .insert(budgetTransactions)
            .values(budgetSpendRows)
            .onConflictDoNothing()
            .returning()
    ).length;

    const slotRows: (typeof volunteerSlots.$inferInsert)[] = data.volunteers.map((slot, i) => ({
        id: sid("slot", i),
        workspaceId,
        title: slot.title,
        description: slot.description,
        startTime: at(slot.days, 8),
        endTime: at(slot.days, 14),
        capacity: 4,
    }));
    counts.volunteerSlots = (
        await db.insert(volunteerSlots).values(slotRows).onConflictDoNothing().returning()
    ).length;

    const signupRows: (typeof volunteerSignups.$inferInsert)[] = slotRows.flatMap((_slot, sIndex) =>
        people.slice(0, 2).map((userId, userIndex) => ({
            id: sid("volunteerSignup", `${sIndex}:${userIndex}`),
            slotId: sid("slot", sIndex),
            userId,
        })),
    );
    counts.volunteerSignups = (
        await db.insert(volunteerSignups).values(signupRows).onConflictDoNothing().returning()
    ).length;

    const kudosRows: (typeof kudos.$inferInsert)[] = data.kudos.map((message, i) => ({
        id: sid("kudos", i),
        workspaceId,
        senderId: adminId,
        receiverId: people[(i + 1) % people.length],
        message,
        createdAt: at(-6 + i),
    }));
    counts.kudos = (
        await db.insert(kudos).values(kudosRows).onConflictDoNothing().returning()
    ).length;

    const threadRows: (typeof messageThreads.$inferInsert)[] = data.threads.map((thread, i) => ({
        id: sid("thread", i),
        workspaceId,
        subject: thread.subject,
        subgroupId: sid("subgroup", i % subgroupRows.length),
        createdAt: at(-12 + i),
    }));
    counts.messageThreads = (
        await db.insert(messageThreads).values(threadRows).onConflictDoNothing().returning()
    ).length;

    const messageRows: (typeof messages.$inferInsert)[] = data.threads.flatMap((thread, tIndex) =>
        thread.messages.map((content, mIndex) => ({
            id: sid("message", `${tIndex}:${mIndex}`),
            threadId: sid("thread", tIndex),
            senderId: mIndex % 2 === 0 ? adminId : people[1 % people.length],
            content,
            createdAt: at(-12 + tIndex, 10 + mIndex),
        })),
    );
    counts.messages = (
        await db.insert(messages).values(messageRows).onConflictDoNothing().returning()
    ).length;

    const pollRows: (typeof polls.$inferInsert)[] = data.polls.map((poll, i) => ({
        id: sid("poll", i),
        workspaceId,
        title: poll.title,
        description: poll.description,
        status: "open",
        closesAt: at(14 + i),
        createdById: adminId,
        createdAt: at(-10 + i),
    }));
    counts.polls = (
        await db.insert(polls).values(pollRows).onConflictDoNothing().returning()
    ).length;

    const optionRows: (typeof pollOptions.$inferInsert)[] = data.polls.flatMap((poll, pIndex) =>
        poll.options.map((text, oIndex) => ({
            id: sid("pollOption", `${pIndex}:${oIndex}`),
            pollId: sid("poll", pIndex),
            text,
            position: oIndex,
        })),
    );
    counts.pollOptions = (
        await db.insert(pollOptions).values(optionRows).onConflictDoNothing().returning()
    ).length;

    const voteRows: (typeof pollVotes.$inferInsert)[] = data.polls.flatMap((poll, pIndex) =>
        people.map((userId, userIndex) => ({
            id: sid("pollVote", `${pIndex}:${userIndex}`),
            pollId: sid("poll", pIndex),
            optionId: sid("pollOption", `${pIndex}:${userIndex % poll.options.length}`),
            userId,
            createdAt: at(-8 + pIndex),
        })),
    );
    counts.pollVotes = (
        await db.insert(pollVotes).values(voteRows).onConflictDoNothing().returning()
    ).length;

    const goalRows: (typeof goals.$inferInsert)[] = data.goals.map((goal, i) => ({
        id: sid("goal", i),
        workspaceId,
        title: goal.title,
        description: goal.description,
        ownerId: people[i % people.length],
        status: "active",
        dueDate: at(90),
        createdAt: at(-40 + i),
    }));
    counts.goals = (
        await db.insert(goals).values(goalRows).onConflictDoNothing().returning()
    ).length;

    const keyResultRows: (typeof keyResults.$inferInsert)[] = data.goals.flatMap((goal, gIndex) =>
        goal.keyResults.map((result, rIndex) => ({
            id: sid("keyResult", `${gIndex}:${rIndex}`),
            goalId: sid("goal", gIndex),
            title: result.title,
            target: result.target,
            current: result.current,
            unit: result.unit,
            position: rIndex,
        })),
    );
    counts.keyResults = (
        await db.insert(keyResults).values(keyResultRows).onConflictDoNothing().returning()
    ).length;

    const dueRows: (typeof memberDues.$inferInsert)[] = data.dues.map((due, i) => ({
        id: sid("due", i),
        workspaceId,
        userId: people[i % people.length],
        title: due.title,
        amountCents: due.amountCents,
        dueDate: at(14 + i * 7),
        status: due.status,
        paidAt: due.status === "paid" ? at(-3) : null,
    }));
    counts.memberDues = (
        await db.insert(memberDues).values(dueRows).onConflictDoNothing().returning()
    ).length;

    const assetRows: (typeof assets.$inferInsert)[] = data.assets.map((asset, i) => ({
        id: sid("asset", i),
        workspaceId,
        name: asset.name,
        description: asset.description,
        quantity: asset.quantity,
        condition: asset.condition,
    }));
    counts.assets = (
        await db.insert(assets).values(assetRows).onConflictDoNothing().returning()
    ).length;

    const loanRows: (typeof assetLoans.$inferInsert)[] = [
        {
            id: sid("loan", 0),
            assetId: sid("asset", 0),
            userId: people[1 % people.length],
            quantity: 1,
            borrowedAt: at(-5),
            dueAt: at(5),
            status: "out",
        },
        {
            id: sid("loan", 1),
            assetId: sid("asset", 1 % data.assets.length),
            userId: people[2 % people.length],
            quantity: 1,
            borrowedAt: at(-12),
            dueAt: at(-4),
            returnedAt: at(-5),
            status: "returned",
        },
    ];
    counts.assetLoans = (
        await db.insert(assetLoans).values(loanRows).onConflictDoNothing().returning()
    ).length;

    const decisionRows: (typeof decisions.$inferInsert)[] = data.decisions.map((decision, i) => ({
        id: sid("decision", i),
        workspaceId,
        title: decision.title,
        summary: decision.summary,
        entityType: "proposal",
        entityId: sid("proposal", i % data.proposals.length),
        decidedById: adminId,
        decidedAt: at(-7 - i),
    }));
    counts.decisions = (
        await db.insert(decisions).values(decisionRows).onConflictDoNothing().returning()
    ).length;

    const cooperationRows: (typeof cooperationRequests.$inferInsert)[] = data.cooperation.map(
        (request, i) => ({
            id: sid("cooperation", i),
            workspaceId,
            clubName: request.clubName,
            contactName: request.contactName,
            contactEmail: request.contactEmail,
            eventTitle: request.eventTitle,
            description: request.description,
            proposedDate: at(30),
            resourcesNeeded: request.resourcesNeeded,
            status: request.status,
            submittedById: adminId,
            reviewedById: request.status === "pending" ? null : adminId,
        }),
    );
    counts.cooperationRequests = (
        await db
            .insert(cooperationRequests)
            .values(cooperationRows)
            .onConflictDoNothing()
            .returning()
    ).length;

    const purchaseRows: (typeof purchaseRequests.$inferInsert)[] = data.purchases.map(
        (request, i) => ({
            id: sid("purchase", i),
            workspaceId,
            title: request.title,
            itemName: request.itemName,
            costCents: request.costCents,
            justification: request.justification,
            quantity: i + 1,
            status: request.status,
            submittedById: adminId,
            reviewedById: request.status === "submitted" ? null : adminId,
        }),
    );
    counts.purchaseRequests = (
        await db.insert(purchaseRequests).values(purchaseRows).onConflictDoNothing().returning()
    ).length;

    const showcaseRows: (typeof showcaseItems.$inferInsert)[] = data.showcases.map((item, i) => ({
        id: sid("showcase", i),
        workspaceId,
        type: item.type,
        title: item.title,
        description: item.description,
        linkUrl: item.linkUrl,
        sortOrder: i,
        isActive: true,
        createdById: adminId,
    }));
    counts.showcaseItems = (
        await db.insert(showcaseItems).values(showcaseRows).onConflictDoNothing().returning()
    ).length;

    const notificationRows: (typeof notifications.$inferInsert)[] = data.notifications.map(
        (notification, i) => ({
            id: sid("notification", i),
            workspaceId,
            userId: people[i % people.length],
            title: notification.title,
            body: notification.body,
            type: notification.type,
            read: i % 3 === 0,
            link: i % 3 === 0 ? "/tasks" : i % 3 === 1 ? "/events" : "/kudos",
            createdAt: at(-2 - i),
        }),
    );
    counts.notifications = (
        await db.insert(notifications).values(notificationRows).onConflictDoNothing().returning()
    ).length;

    const attachmentRows: (typeof attachments.$inferInsert)[] = data.tasks.map((task, i) => ({
        id: sid("attachment", i),
        workspaceId,
        entityType: "task",
        entityId: sid("task", i),
        fileName: `${slug}-brief-${i + 1}.pdf`,
        fileSize: 102400 + i * 2048,
        mimeType: "application/pdf",
        storagePath: `demo/${slug}/brief-${i + 1}.pdf`,
        sha256: sid("attachmentHash", i),
        uploadedById: adminId,
    }));
    counts.attachments = (
        await db.insert(attachments).values(attachmentRows).onConflictDoNothing().returning()
    ).length;

    const reactionRows: (typeof reactions.$inferInsert)[] = data.tasks.map((task, i) => ({
        id: sid("reaction", i),
        workspaceId,
        entityType: "task",
        entityId: sid("task", i),
        userId: people[i % people.length],
        emoji: ["like", "support", "insightful"][i % 3],
    }));
    counts.reactions = (
        await db.insert(reactions).values(reactionRows).onConflictDoNothing().returning()
    ).length;

    const customFieldRows: (typeof customFieldDefs.$inferInsert)[] = data.customFields.map(
        (field, i) => ({
            id: sid("customField", i),
            workspaceId,
            entityType: field.entityType,
            key: field.key,
            label: field.label,
            fieldType: field.fieldType,
            options: field.options ?? [],
            position: i,
        }),
    );
    counts.customFieldDefs = (
        await db.insert(customFieldDefs).values(customFieldRows).onConflictDoNothing().returning()
    ).length;

    return counts;
}

async function main(): Promise<void> {
    const args = process.argv
        .slice(2)
        .map(normalizeSlug)
        .filter((slug): slug is string => slug !== null);
    const slugs = args.length > 0 ? args : ["developers", "stuco"];
    let failed = 0;
    try {
        for (const slug of slugs) {
            try {
                const counts = await seedPortal(slug);
                const summary = Object.entries(counts)
                    .filter(([, count]) => count > 0)
                    .map(([table, count]) => `${table}=+${count}`)
                    .join(" ");
                console.log(`[${slug}] ${summary || "no new rows"}`);
            } catch (err) {
                failed += 1;
                console.error(`[${slug}] ${err instanceof Error ? err.message : String(err)}`);
                const cause = (err as { cause?: unknown })?.cause;
                if (cause) console.error(`[${slug}] cause: ${String(cause)}`);
            }
        }
    } finally {
        await closeAllPools();
    }
    if (failed > 0) process.exitCode = 1;
}

main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
});
