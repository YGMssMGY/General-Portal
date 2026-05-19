import {
  PrismaClient,
  TaskStatus,
  TaskPriority,
  ProposalType,
  ProposalStatus,
  EventStatus,
  TransactionCategory,
  TransactionStatus,
  ThreadContext,
  ThreadStatus,
  MemberVisibility,
} from "@prisma/client";
import { ROLE_PERMISSIONS } from "../src/lib/permissions.js";

const dbUrl =
  process.env["DATABASE_URL_DEVELOPERS"] ||
  "postgresql://localhost:5432/general_portal_dev";
process.env["DATABASE_URL"] = dbUrl;

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

async function main() {
  /* ── Workspace ── */
  let workspace = await prisma.workspace.findFirst();
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: "General Portal Workspace",
        description: "Student Council Workspace",
      },
    });
    console.log("[seed] Created workspace");
  } else {
    console.log("[seed] Workspace exists, reusing");
  }

  /* ── Users (by email) ── */
  const userDefs = [
    { email: "chris@example.edu", displayName: "Chris Rivera" },
    { email: "sarah.j@example.edu", displayName: "Sarah Jenkins" },
    { email: "maya.c@example.edu", displayName: "Maya Chen" },
    { email: "jordan.d@example.edu", displayName: "Jordan Diaz" },
    { email: "dev@generalportal.local", displayName: "Dev Admin" },
    { email: "dev.admin@generalportal.local", displayName: "Dev Admin" },
    {
      email: "dev.president@generalportal.local",
      displayName: "Dev President",
    },
    { email: "dev.officer@generalportal.local", displayName: "Dev Officer" },
    { email: "dev.member@generalportal.local", displayName: "Dev Member" },
  ];

  const users = await Promise.all(
    userDefs.map((u) =>
      prisma.userAccount.upsert({
        where: { email: u.email },
        create: u,
        update: {},
      }),
    ),
  );

  // users[0..8] used below in membershipDefs

  /* ── Memberships (by workspaceId + userId) ── */
  const membershipDefs = [
    { user: users[0], position: "Admin", accessLabel: "Admin", tc: 4, vh: 88 },
    {
      user: users[1],
      position: "President",
      accessLabel: "President",
      tc: 5,
      vh: 120,
    },
    {
      user: users[2],
      position: "Officer",
      accessLabel: "Officer",
      tc: 3,
      vh: 96,
    },
    {
      user: users[3],
      position: "Member",
      accessLabel: "Member",
      tc: 7,
      vh: 142,
    },
    { user: users[4], position: "Admin", accessLabel: "Admin", tc: 0, vh: 0 },
    { user: users[5], position: "Admin", accessLabel: "Admin", tc: 0, vh: 0 },
    {
      user: users[6],
      position: "President",
      accessLabel: "President",
      tc: 0,
      vh: 0,
    },
    {
      user: users[7],
      position: "Officer",
      accessLabel: "Officer",
      tc: 0,
      vh: 0,
    },
    { user: users[8], position: "Member", accessLabel: "Member", tc: 0, vh: 0 },
  ];

  const allRoles = [
    "admin",
    "admin",
    "president",
    "officer",
    "member",
    "admin",
    "president",
    "officer",
    "member",
  ];
  const permSets = allRoles.map(
    (r) =>
      ROLE_PERMISSIONS[r as keyof typeof ROLE_PERMISSIONS] ||
      ROLE_PERMISSIONS.member,
  );

  for (let i = 0; i < membershipDefs.length; i++) {
    const def = membershipDefs[i];
    let membership = await prisma.membership.findUnique({
      where: {
        workspaceId_userId: { workspaceId: workspace.id, userId: def.user.id },
      },
    });
    if (!membership) {
      membership = await prisma.membership.create({
        data: {
          workspaceId: workspace.id,
          userId: def.user.id,
          position: def.position,
          accessLabel: def.accessLabel,
          taskCount: def.tc,
          volunteerHours: def.vh,
        },
      });
    }
    for (const perm of permSets[i]) {
      await prisma.permissionGrant.upsert({
        where: {
          membershipId_permission: {
            membershipId: membership.id,
            permission: perm,
          },
        },
        create: { membershipId: membership.id, permission: perm },
        update: {},
      });
    }
  }

  /* ── Seed data: only create when empty ── */
  async function seedTasks() {
    const count = await prisma.taskItem.count({
      where: { workspaceId: workspace.id },
    });
    if (count > 0) {
      console.log("[seed] Tasks exist, skipping");
      return;
    }
    await prisma.taskItem.createMany({
      data: [
        {
          workspaceId: workspace.id,
          title: "Confirm gym reservation",
          status: TaskStatus.todo,
          priority: TaskPriority.high,
          project: "Winter Formal",
          dueDate: new Date(Date.now() + 8 * 86400000),
          assigneeName: "Maya Chen",
        },
        {
          workspaceId: workspace.id,
          title: "Update volunteer contact list",
          status: TaskStatus.todo,
          priority: TaskPriority.low,
          project: "General Admin",
          dueDate: new Date(Date.now() + 12 * 86400000),
          assigneeName: "Jordan Diaz",
        },
        {
          workspaceId: workspace.id,
          title: "Design fundraiser poster",
          status: TaskStatus.in_progress,
          priority: TaskPriority.medium,
          project: "Fall Drive",
          dueDate: new Date(Date.now() + 86400000),
          assigneeName: "Chris Rivera",
          progress: 50,
        },
        {
          workspaceId: workspace.id,
          title: "Approve catering budget",
          status: TaskStatus.blocked,
          priority: TaskPriority.high,
          project: "Winter Formal",
          dueDate: new Date(Date.now() - 86400000),
          assigneeName: "Sarah Jenkins",
          progress: 20,
          blockedReason: "Waiting on Finance Dept",
        },
      ],
    });
  }
  await seedTasks();

  async function seedProposals() {
    const count = await prisma.proposal.count({
      where: { workspaceId: workspace.id },
    });
    if (count > 0) {
      console.log("[seed] Proposals exist, skipping");
      return;
    }
    await prisma.proposal.createMany({
      data: [
        {
          workspaceId: workspace.id,
          title: "Winter Formal Decoration Plan",
          type: ProposalType.Event,
          status: ProposalStatus.under_review,
          submittedBy: "Sarah Jenkins",
          submittedAt: new Date(Date.now() - 86400000),
          budget: 1850,
          summary:
            "Decor, lighting, and table styling plan for the winter formal venue.",
        },
        {
          workspaceId: workspace.id,
          title: "Fall Merchandise Design",
          type: ProposalType.Purchase,
          status: ProposalStatus.submitted,
          submittedBy: "Maya Chen",
          submittedAt: new Date(Date.now() - 7200000),
          budget: 940,
          summary: "Hoodie and sticker set for the fall membership drive.",
        },
        {
          workspaceId: workspace.id,
          title: "Community Garden Workday",
          type: ProposalType.Project,
          status: ProposalStatus.approved,
          submittedBy: "Jordan Diaz",
          submittedAt: new Date(Date.now() - 420000000),
          budget: 420,
          summary:
            "Volunteer event for cleanup, planting, and signage updates.",
        },
      ],
    });
  }
  await seedProposals();

  async function seedEvents() {
    const count = await prisma.eventItem.count({
      where: { workspaceId: workspace.id },
    });
    if (count > 0) {
      console.log("[seed] Events exist, skipping");
      return;
    }
    await prisma.eventItem.create({
      data: {
        workspaceId: workspace.id,
        title: "Spirit Week 2026",
        status: EventStatus.active,
        startsAt: new Date(Date.now() + 1296000000),
        endsAt: new Date(Date.now() + 1641600000),
        progress: 75,
        budgetUsed: 2500,
        budgetTotal: 3000,
        owners: {
          create: [
            { ownerLabel: "JD" },
            { ownerLabel: "AL" },
            { ownerLabel: "+3" },
          ],
        },
      },
    });

    await prisma.eventItem.create({
      data: {
        workspaceId: workspace.id,
        title: "Winter Formal",
        status: EventStatus.pending,
        startsAt: new Date("2026-12-10T19:00:00Z"),
        progress: 30,
        budgetUsed: 1200,
        budgetTotal: 6200,
        owners: { create: [{ ownerLabel: "SJ" }, { ownerLabel: "MC" }] },
      },
    });
  }
  await seedEvents();

  async function seedVolunteerSlots() {
    const count = await prisma.volunteerSlot.count({
      where: { workspaceId: workspace.id },
    });
    if (count > 0) {
      console.log("[seed] Volunteer slots exist, skipping");
      return;
    }
    await prisma.volunteerSlot.createMany({
      data: [
        {
          workspaceId: workspace.id,
          title: "Food Booth Setup",
          eventName: "Spirit Week",
          startsAt: new Date(Date.now() + 1292400000),
          capacity: 10,
          filled: 8,
          hours: 4,
        },
        {
          workspaceId: workspace.id,
          title: "Check-in Table",
          eventName: "Winter Formal",
          startsAt: new Date("2026-12-10T18:00:00Z"),
          capacity: 6,
          filled: 4,
          hours: 3,
        },
      ],
    });
  }
  await seedVolunteerSlots();

  async function seedFinance() {
    const count = await prisma.financeTransaction.count({
      where: { workspaceId: workspace.id },
    });
    if (count > 0) {
      console.log("[seed] Finance transactions exist, skipping");
      return;
    }
    await prisma.financeTransaction.createMany({
      data: [
        {
          workspaceId: workspace.id,
          title: "Receipt for event posters",
          category: TransactionCategory.Printing,
          status: TransactionStatus.pending,
          submittedBy: "Maya Chen",
          amount: 86.25,
          occurredAt: new Date(Date.now() - 7200000),
        },
        {
          workspaceId: workspace.id,
          title: "Venue deposit",
          category: TransactionCategory.Event,
          status: TransactionStatus.approved,
          submittedBy: "Sarah Jenkins",
          amount: 500,
          occurredAt: new Date(Date.now() - 260000000),
        },
        {
          workspaceId: workspace.id,
          title: "Catering quote",
          category: TransactionCategory.Food,
          status: TransactionStatus.under_review,
          submittedBy: "Chris Rivera",
          amount: 1280,
          occurredAt: new Date(Date.now() - 160000000),
        },
      ],
    });
  }
  await seedFinance();

  async function seedMessages() {
    const count = await prisma.messageThread.count({
      where: { workspaceId: workspace.id },
    });
    if (count > 0) {
      console.log("[seed] Message threads exist, skipping");
      return;
    }
    await prisma.messageThread.create({
      data: {
        workspaceId: workspace.id,
        title: "Winter Formal Planning",
        context: ThreadContext.event,
        status: ThreadStatus.active,
        preview: "Sarah: I updated the seating chart for the VIP section.",
        unreadCount: 2,
        lastMessageAt: new Date(Date.now() - 3600000),
        participants: {
          create: [{ name: "Sarah" }, { name: "Maya" }, { name: "Chris" }],
        },
        messages: {
          create: [
            {
              authorName: "Sarah",
              body: "I updated the seating chart for the VIP section.",
              sentAt: new Date(Date.now() - 3600000),
            },
            {
              authorName: "Chris",
              body: "Great, please attach it to the event file list too.",
              sentAt: new Date(Date.now() - 3300000),
            },
          ],
        },
      },
    });

    await prisma.messageThread.create({
      data: {
        workspaceId: workspace.id,
        title: "Confirm Decorations Task",
        context: ThreadContext.task,
        status: ThreadStatus.completed,
        preview: "Mark: All balloons and banners ordered.",
        lastMessageAt: new Date(Date.now() - 90000000),
        participants: { create: [{ name: "Mark" }, { name: "Chris" }] },
        messages: {
          create: [
            {
              authorName: "Mark",
              body: "All balloons and banners ordered.",
              sentAt: new Date(Date.now() - 90000000),
            },
          ],
        },
      },
    });
  }
  await seedMessages();

  async function seedFiles() {
    const count = await prisma.workspaceFile.count({
      where: { workspaceId: workspace.id },
    });
    if (count > 0) {
      console.log("[seed] Files exist, skipping");
      return;
    }
    await prisma.workspaceFile.createMany({
      data: [
        {
          workspaceId: workspace.id,
          name: "Winter Formal Budget.xlsx",
          fileType: "Spreadsheet",
          ownerName: "Sarah Jenkins",
          linkedResource: "Winter Formal",
          sizeLabel: "84 KB",
          storageKey: "files/winter-formal-budget",
          fileUpdatedAt: new Date(Date.now() - 1800000),
        },
        {
          workspaceId: workspace.id,
          name: "Volunteer Roster.pdf",
          fileType: "PDF",
          ownerName: "Jordan Diaz",
          linkedResource: "Volunteer Program",
          sizeLabel: "1.2 MB",
          storageKey: "files/volunteer-roster",
          fileUpdatedAt: new Date(Date.now() - 180000000),
        },
      ],
    });
  }
  await seedFiles();

  async function seedActivityLogs() {
    const count = await prisma.activityLog.count({
      where: { workspaceId: workspace.id },
    });
    if (count > 0) {
      console.log("[seed] Activity logs exist, skipping");
      return;
    }
    await prisma.activityLog.createMany({
      data: [
        {
          workspaceId: workspace.id,
          actorName: "Maya Chen",
          action: "uploaded a receipt",
          resourceType: "Finance",
          resourceTitle: "Event posters",
          occurredAt: new Date(Date.now() - 7200000),
        },
        {
          workspaceId: workspace.id,
          actorName: "Chris Rivera",
          action: "approved proposal",
          resourceType: "Proposal",
          resourceTitle: "#142",
          occurredAt: new Date(Date.now() - 18000000),
        },
        {
          workspaceId: workspace.id,
          actorName: "Sarah Jenkins",
          action: "created an event",
          resourceType: "Event",
          resourceTitle: "Spirit Week 2026",
          occurredAt: new Date(Date.now() - 96000000),
        },
      ],
    });
  }
  await seedActivityLogs();

  async function seedSettings() {
    const existing = await prisma.workspaceSettings.findUnique({
      where: { workspaceId: workspace.id },
    });
    if (existing) {
      console.log("[seed] Settings exist, skipping");
      return;
    }
    await prisma.workspaceSettings.create({
      data: {
        workspaceId: workspace.id,
        defaultVisibility: MemberVisibility.members,
        requireProposalApproval: false,
        allowMemberInvites: true,
        fiscalYearStart: "August",
      },
    });
  }
  await seedSettings();

  async function seedPublicEvents() {
    const count = await prisma.publicEvent.count({
      where: { workspaceId: workspace.id },
    });
    if (count > 0) {
      console.log("[seed] Public events exist, skipping");
      return;
    }
    await prisma.publicEvent.createMany({
      data: [
        {
          workspaceId: workspace.id,
          title: "Annual Hackathon 2025",
          eventDate: new Date("2025-11-15"),
          description:
            "Our flagship event brought together over 200 participants.",
          category: "Competition",
        },
        {
          workspaceId: workspace.id,
          title: "Spring Coding Workshop",
          eventDate: new Date("2025-04-10"),
          description:
            "Hands-on sessions covering web development, Python, and introductory programming.",
          category: "Workshop",
        },
        {
          workspaceId: workspace.id,
          title: "Leadership Summit",
          eventDate: new Date("2025-09-22"),
          description:
            "An inspiring gathering of students, mentors, and industry professionals.",
          category: "Conference",
        },
      ],
    });
  }
  await seedPublicEvents();

  async function seedPhotos() {
    const count = await prisma.photo.count({
      where: { workspaceId: workspace.id },
    });
    if (count > 0) {
      console.log("[seed] Photos exist, skipping");
      return;
    }
    await prisma.photo.createMany({
      data: [
        {
          workspaceId: workspace.id,
          title: "Group Photo",
          photoDate: new Date("2025-11-15"),
          description: "Participants at the Annual Hackathon.",
        },
        {
          workspaceId: workspace.id,
          title: "Workshop Session",
          photoDate: new Date("2025-04-10"),
          description: "Students engaged in hands-on coding.",
        },
        {
          workspaceId: workspace.id,
          title: "Award Ceremony",
          photoDate: new Date("2025-09-22"),
          description: "Award recipients at the Leadership Summit.",
        },
      ],
    });
  }
  await seedPhotos();

  console.log("[seed] Database seeded successfully");
}

main()
  .catch((e) => {
    console.error("[seed] Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
