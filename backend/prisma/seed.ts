import { PrismaClient, TaskStatus, TaskPriority, EventStatus } from "@prisma/client";
import { ROLE_PERMISSIONS } from "../src/lib/permissions.js";
const dbUrl =
    process.env["DATABASE_URL_DEVELOPERS"] || "postgresql://localhost:5432/general_portal_dev";
process.env["DATABASE_URL"] = dbUrl;

const isStuco = dbUrl.includes("general_portal_stuco");
const portal: "developers" | "stuco" = isStuco ? "stuco" : "developers";

const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
});

const WHITELIST = [
    {
        email: "zhiyu.jiang90454-bisz@basischina.com",
        name: "Jiang, Zhiyu Richard",
        portals: ["developers", "stuco"] as const,
    },
    {
        email: "chunping.wong12024-bisz@basischina.com",
        name: "Wong, Chun Ping Eric",
        portals: ["developers"] as const,
    },
    {
        email: "zuheng.liu13010-bisz@basischina.com",
        name: "Liu, Zuheng Harry",
        portals: ["developers"] as const,
    },
    { email: "chris.xu11265-bisz@basischina.com", name: "Xu, Chris", portals: ["stuco"] as const },
    { email: "alice.wu10926-bisz@basischina.com", name: "Wu, Alice", portals: ["stuco"] as const },
];

async function main() {
    for (const entry of WHITELIST) {
        if (!entry.portals.includes(portal)) continue;

        const wsName = portal === "developers" ? "Developers Club" : "Student Council";

        let workspace = await prisma.workspace.findFirst({ where: { name: wsName } });
        if (!workspace) {
            workspace = await prisma.workspace.create({
                data: { name: wsName, description: `${wsName} workspace` },
            });
            console.log(`[seed] Created workspace: ${wsName}`);
        }

        let user = await prisma.user.findUnique({ where: { email: entry.email } });
        if (!user) {
            user = await prisma.user.create({
                data: { email: entry.email, name: entry.name },
            });
            console.log(`[seed] Created user: ${entry.email}`);
        }

        const existing = await prisma.membership.findUnique({
            where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
        });

        if (!existing) {
            const membership = await prisma.membership.create({
                data: {
                    workspaceId: workspace.id,
                    userId: user.id,
                    position: "Admin",
                    accessLabel: "Admin",
                    taskCount: 0,
                    volunteerHours: 0,
                },
            });
            for (const perm of ROLE_PERMISSIONS.admin) {
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
            console.log(`[seed] Created admin membership for ${entry.name} in ${wsName}`);
        }
    } // <-- This closes the for loop (only one brace here)

    // Minimal demo data
    for (const ws of await prisma.workspace.findMany()) {
        const taskCount = await prisma.taskItem.count({ where: { workspaceId: ws.id } });
        if (taskCount === 0) {
            await prisma.taskItem.createMany({
                data: [
                    {
                        workspaceId: ws.id,
                        title: "Welcome — set up your workspace",
                        status: TaskStatus.todo,
                        priority: TaskPriority.high,
                    },
                    {
                        workspaceId: ws.id,
                        title: "Review upcoming events",
                        status: TaskStatus.todo,
                        priority: TaskPriority.medium,
                    },
                ],
            });
        }

        const eventCount = await prisma.eventItem.count({ where: { workspaceId: ws.id } });
        if (eventCount === 0) {
            await prisma.eventItem.create({
                data: {
                    workspaceId: ws.id,
                    title: "Kickoff Meeting",
                    status: EventStatus.active,
                    startsAt: new Date(Date.now() + 7 * 86400000),
                    progress: 0,
                    budgetUsed: 0,
                    budgetTotal: 0,
                },
            });
        }
    }

    console.log("[seed] Done");
}
main()
    .catch((e) => {
        console.error("[seed] Error:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
