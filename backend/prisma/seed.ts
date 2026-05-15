import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.workspace.findFirst();
  if (existing) {
    console.log("[seed] Database already seeded, skipping");
    return;
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: "General Portal Workspace",
      description: "Student Council Workspace",
    },
  });

  const users = await Promise.all([
    prisma.userAccount.create({
      data: { email: "chris@example.edu", displayName: "Chris Rivera" },
    }),
    prisma.userAccount.create({
      data: { email: "sarah.j@example.edu", displayName: "Sarah Jenkins" },
    }),
    prisma.userAccount.create({
      data: { email: "maya.c@example.edu", displayName: "Maya Chen" },
    }),
    prisma.userAccount.create({
      data: { email: "jordan.d@example.edu", displayName: "Jordan Diaz" },
    }),
    prisma.userAccount.create({
      data: { email: "dev@generalportal.local", displayName: "Dev Admin" },
    }),
    prisma.userAccount.create({
      data: {
        email: "dev.admin@generalportal.local",
        displayName: "Dev Admin",
      },
    }),
    prisma.userAccount.create({
      data: {
        email: "dev.president@generalportal.local",
        displayName: "Dev President",
      },
    }),
    prisma.userAccount.create({
      data: {
        email: "dev.officer@generalportal.local",
        displayName: "Dev Officer",
      },
    }),
    prisma.userAccount.create({
      data: {
        email: "dev.member@generalportal.local",
        displayName: "Dev Member",
      },
    }),
  ]);

  const [
    chris,
    sarah,
    maya,
    jordan,
    dev,
    devAdmin,
    devPresident,
    devOfficer,
    devMember,
  ] = users;

  const memberships = await Promise.all([
    createMembership(workspace.id, chris.id, "Admin", "Admin", 4, 88),
    createMembership(workspace.id, sarah.id, "President", "President", 5, 120),
    createMembership(workspace.id, maya.id, "Officer", "Officer", 3, 96),
    createMembership(workspace.id, jordan.id, "Member", "Member", 7, 142),
    createMembership(workspace.id, dev.id, "Admin", "Admin", 0, 0),
    createMembership(workspace.id, devAdmin.id, "Admin", "Admin", 0, 0),
    createMembership(
      workspace.id,
      devPresident.id,
      "President",
      "President",
      0,
      0,
    ),
    createMembership(workspace.id, devOfficer.id, "Officer", "Officer", 0, 0),
    createMembership(workspace.id, devMember.id, "Member", "Member", 0, 0),
  ]);

  const permSets = [
    adminPerms(),
    adminPerms(),
    presidentPerms(),
    officerPerms(),
    memberPerms(),
    adminPerms(),
    presidentPerms(),
    officerPerms(),
    memberPerms(),
  ];

  for (let i = 0; i < memberships.length; i++) {
    await Promise.all(
      permSets[i].map((perm) =>
        prisma.permissionGrant.create({
          data: { membershipId: memberships[i].id, permission: perm },
        }),
      ),
    );
  }

  await prisma.taskItem.createMany({
    data: [
      {
        workspaceId: workspace.id,
        title: "Confirm gym reservation",
        status: "todo",
        priority: "high",
        project: "Winter Formal",
        dueDate: new Date(Date.now() + 8 * 86400000),
        assigneeName: "Maya Chen",
      },
      {
        workspaceId: workspace.id,
        title: "Update volunteer contact list",
        status: "todo",
        priority: "low",
        project: "General Admin",
        dueDate: new Date(Date.now() + 12 * 86400000),
        assigneeName: "Jordan Diaz",
      },
      {
        workspaceId: workspace.id,
        title: "Design fundraiser poster",
        status: "in_progress",
        priority: "medium",
        project: "Fall Drive",
        dueDate: new Date(Date.now() + 86400000),
        assigneeName: "Chris Rivera",
        progress: 50,
      },
      {
        workspaceId: workspace.id,
        title: "Approve catering budget",
        status: "blocked",
        priority: "high",
        project: "Winter Formal",
        dueDate: new Date(Date.now() - 86400000),
        assigneeName: "Sarah Jenkins",
        progress: 20,
        blockedReason: "Waiting on Finance Dept",
      },
    ],
  });

  await prisma.proposal.createMany({
    data: [
      {
        workspaceId: workspace.id,
        title: "Winter Formal Decoration Plan",
        type: "Event",
        status: "under_review",
        submittedBy: "Sarah Jenkins",
        submittedAt: new Date(Date.now() - 86400000),
        budget: 1850,
        summary:
          "Decor, lighting, and table styling plan for the winter formal venue.",
      },
      {
        workspaceId: workspace.id,
        title: "Fall Merchandise Design",
        type: "Purchase",
        status: "submitted",
        submittedBy: "Maya Chen",
        submittedAt: new Date(Date.now() - 7200000),
        budget: 940,
        summary: "Hoodie and sticker set for the fall membership drive.",
      },
      {
        workspaceId: workspace.id,
        title: "Community Garden Workday",
        type: "Project",
        status: "approved",
        submittedBy: "Jordan Diaz",
        submittedAt: new Date(Date.now() - 420000000),
        budget: 420,
        summary: "Volunteer event for cleanup, planting, and signage updates.",
      },
    ],
  });

  const event1 = await prisma.eventItem.create({
    data: {
      workspaceId: workspace.id,
      title: "Spirit Week 2026",
      status: "active",
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

  const event2 = await prisma.eventItem.create({
    data: {
      workspaceId: workspace.id,
      title: "Winter Formal",
      status: "pending",
      startsAt: new Date("2026-12-10T19:00:00Z"),
      progress: 30,
      budgetUsed: 1200,
      budgetTotal: 6200,
      owners: { create: [{ ownerLabel: "SJ" }, { ownerLabel: "MC" }] },
    },
  });

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

  await prisma.financeTransaction.createMany({
    data: [
      {
        workspaceId: workspace.id,
        title: "Receipt for event posters",
        category: "Printing",
        status: "pending",
        submittedBy: "Maya Chen",
        amount: 86.25,
        occurredAt: new Date(Date.now() - 7200000),
      },
      {
        workspaceId: workspace.id,
        title: "Venue deposit",
        category: "Event",
        status: "approved",
        submittedBy: "Sarah Jenkins",
        amount: 500,
        occurredAt: new Date(Date.now() - 260000000),
      },
      {
        workspaceId: workspace.id,
        title: "Catering quote",
        category: "Food",
        status: "under_review",
        submittedBy: "Chris Rivera",
        amount: 1280,
        occurredAt: new Date(Date.now() - 160000000),
      },
    ],
  });

  const thread1 = await prisma.messageThread.create({
    data: {
      workspaceId: workspace.id,
      title: "Winter Formal Planning",
      context: "event",
      status: "active",
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
      context: "task",
      status: "completed",
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

  await prisma.workspaceSettings.create({
    data: {
      workspaceId: workspace.id,
      defaultVisibility: "members",
      requireProposalApproval: false,
      allowMemberInvites: true,
      fiscalYearStart: "August",
    },
  });

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

  console.log("[seed] Database seeded successfully");
}

async function createMembership(
  workspaceId: string,
  userId: string,
  position: string,
  accessLabel: string,
  taskCount: number,
  volunteerHours: number,
) {
  return prisma.membership.create({
    data: {
      workspaceId,
      userId,
      position,
      accessLabel,
      taskCount,
      volunteerHours,
    },
  });
}

function adminPerms() {
  return [
    "task:read",
    "task:write",
    "task:delete",
    "proposal:read",
    "proposal:write",
    "proposal:delete",
    "event:read",
    "event:write",
    "event:delete",
    "volunteer:read",
    "volunteer:write",
    "volunteer:delete",
    "finance:read",
    "finance:write",
    "finance:delete",
    "message:read",
    "message:write",
    "message:delete",
    "file:read",
    "file:write",
    "file:delete",
    "member:read",
    "member:write",
    "member:delete",
    "activity:read",
    "settings:read",
    "settings:write",
  ];
}

function presidentPerms() {
  return [
    "task:read",
    "task:write",
    "proposal:read",
    "proposal:write",
    "event:read",
    "event:write",
    "volunteer:read",
    "volunteer:write",
    "finance:read",
    "message:read",
    "message:write",
    "file:read",
    "member:read",
    "activity:read",
    "settings:read",
  ];
}

function officerPerms() {
  return [
    "task:read",
    "task:write",
    "proposal:read",
    "proposal:write",
    "event:read",
    "event:write",
    "volunteer:read",
    "message:read",
    "message:write",
    "file:read",
    "member:read",
    "activity:read",
  ];
}

function memberPerms() {
  return [
    "task:read",
    "event:read",
    "volunteer:read",
    "message:read",
    "file:read",
    "activity:read",
  ];
}

main()
  .catch((e) => {
    console.error("[seed] Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
