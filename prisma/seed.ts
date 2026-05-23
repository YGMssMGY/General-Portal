import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const devWorkspace = await prisma.workspace.upsert({
    where: { slug: "developers" },
    update: {},
    create: { name: "Developers Club", slug: "developers" },
  });
  console.log(`Workspace created: ${devWorkspace.name} (${devWorkspace.slug})`);

  const stucoWorkspace = await prisma.workspace.upsert({
    where: { slug: "stuco" },
    update: {},
    create: { name: "Student Council", slug: "stuco" },
  });
  console.log(`Workspace created: ${stucoWorkspace.name} (${stucoWorkspace.slug})`);

  const devUsers = [
    { email: "zhiyu.jiang90454-bisz@basischina.com", name: "Zhiyu Jiang" },
    { email: "chunping.wong12024-bisz@basischina.com", name: "Chunping Wong" },
    { email: "zuheng.liu13010-bisz@basischina.com", name: "Zuheng Liu" },
  ];

  const stucoUsers = [
    { email: "zhiyu.jiang90454-bisz@basischina.com", name: "Zhiyu Jiang" },
    { email: "chris.xu11265-bisz@basischina.com", name: "Chris Xu" },
    { email: "alice.wu10926-bisz@basischina.com", name: "Alice Wu" },
  ];

  const allUserSpecs = [
    ...new Map(
      [...devUsers, ...stucoUsers].map((u) => [u.email, u]),
    ).values(),
  ];

  const userByEmail: Record<string, Awaited<ReturnType<typeof prisma.user.upsert>>> = {};

  for (const spec of allUserSpecs) {
    const user = await prisma.user.upsert({
      where: { email: spec.email },
      update: {},
      create: {
        email: spec.email,
        name: spec.name,
      },
    });
    userByEmail[spec.email] = user;
    console.log(`User: ${user.email} (${user.name})`);
  }

  for (const spec of devUsers) {
    await prisma.membership.upsert({
      where: {
        userId_workspaceId: {
          userId: userByEmail[spec.email].id,
          workspaceId: devWorkspace.id,
        },
      },
      update: {},
      create: {
        userId: userByEmail[spec.email].id,
        workspaceId: devWorkspace.id,
        role: "admin",
      },
    });
    console.log(`Membership: ${spec.email} -> Developers Club (admin)`);
  }

  for (const spec of stucoUsers) {
    await prisma.membership.upsert({
      where: {
        userId_workspaceId: {
          userId: userByEmail[spec.email].id,
          workspaceId: stucoWorkspace.id,
        },
      },
      update: {},
      create: {
        userId: userByEmail[spec.email].id,
        workspaceId: stucoWorkspace.id,
        role: "admin",
      },
    });
    console.log(`Membership: ${spec.email} -> Student Council (admin)`);
  }

  const devFirst = userByEmail[devUsers[0].email];

  await prisma.taskItem.deleteMany({
    where: {
      workspaceId: devWorkspace.id,
      title: { in: ["Plan kickoff meeting", "Set up communication channels"] },
    },
  });

  await prisma.taskItem.createMany({
    data: [
      {
        workspaceId: devWorkspace.id,
        title: "Plan kickoff meeting",
        status: "todo",
        createdById: devFirst.id,
      },
      {
        workspaceId: devWorkspace.id,
        title: "Set up communication channels",
        status: "in_progress",
        createdById: devFirst.id,
      },
    ],
  });
  console.log("Demo tasks created for Developers Club");

  const kickoffDate = new Date();
  kickoffDate.setDate(kickoffDate.getDate() + 7);

  await prisma.eventItem.deleteMany({
    where: {
      workspaceId: devWorkspace.id,
      title: "Club Kickoff Event",
    },
  });

  await prisma.eventItem.create({
    data: {
      workspaceId: devWorkspace.id,
      title: "Club Kickoff Event",
      startDate: kickoffDate,
      status: "published",
      isPublic: true,
      createdById: devFirst.id,
    },
  });
  console.log("Demo event created for Developers Club");

  const stucoFirst = userByEmail[stucoUsers[0].email];

  await prisma.taskItem.deleteMany({
    where: {
      workspaceId: stucoWorkspace.id,
      title: { in: ["Plan kickoff meeting", "Set up communication channels"] },
    },
  });

  await prisma.taskItem.createMany({
    data: [
      {
        workspaceId: stucoWorkspace.id,
        title: "Plan kickoff meeting",
        status: "todo",
        createdById: stucoFirst.id,
      },
      {
        workspaceId: stucoWorkspace.id,
        title: "Set up communication channels",
        status: "in_progress",
        createdById: stucoFirst.id,
      },
    ],
  });
  console.log("Demo tasks created for Student Council");

  await prisma.eventItem.deleteMany({
    where: {
      workspaceId: stucoWorkspace.id,
      title: "Club Kickoff Event",
    },
  });

  await prisma.eventItem.create({
    data: {
      workspaceId: stucoWorkspace.id,
      title: "Club Kickoff Event",
      startDate: kickoffDate,
      status: "published",
      isPublic: true,
      createdById: stucoFirst.id,
    },
  });
  console.log("Demo event created for Student Council");

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
