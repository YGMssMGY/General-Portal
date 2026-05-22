import { Hono } from "hono";
import { getAuthUser } from "../lib/get-auth-user.js";
import { z } from "zod";
import { createNotification } from "../lib/notifications.js";

const route = new Hono();

const XP_THRESHOLDS = [
    { level: 1, xp: 0, title: "Bronze" },
    { level: 2, xp: 100, title: "Bronze" },
    { level: 3, xp: 500, title: "Silver" },
    { level: 4, xp: 1000, title: "Gold" },
    { level: 5, xp: 5000, title: "Platinum" },
];

function calculateLevel(totalXp: number): number {
    let level = 1;
    for (const t of XP_THRESHOLDS) {
        if (totalXp >= t.xp) level = t.level;
        else break;
    }
    return level;
}

const awardXpSchema = z.object({
    userId: z.string(),
    amount: z.number().int().positive(),
    reason: z.string().optional(),
});

route.post("/gamification/award-xp", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");

    const body = await c.req.json();
    const parsed = awardXpSchema.parse(body);

    const user = await db.user.findUnique({
        where: { id: parsed.userId },
    });
    if (!user) return c.json({ error: "User not found" }, 404);

    const newXp = user.xp + parsed.amount;
    const oldLevel = user.level;
    const newLevel = calculateLevel(newXp);

    await db.user.update({
        where: { id: parsed.userId },
        data: { xp: newXp, level: newLevel },
    });

    if (newLevel > oldLevel) {
        await createNotification(
            db,
            wid,
            parsed.userId,
            "Level Up!",
            `Congratulations! You reached level ${newLevel} (${XP_THRESHOLDS.find((t) => t.level === newLevel)?.title || ""})!`,
            "level_up",
        );
    }

    return c.json({
        userId: parsed.userId,
        xp: newXp,
        level: newLevel,
        leveledUp: newLevel > oldLevel,
    });
});

route.get("/gamification/leaderboard", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");
    const period = c.req.query("period") || "all";

    const members = await db.membership.findMany({
        where: { workspaceId: wid },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    xp: true,
                    level: true,
                    streak: true,
                },
            },
        },
    });

    let users = members.map((m) => m.user).filter(Boolean);

    if (period === "week") {
        users = users.filter(() => true);
    }

    users.sort((a, b) => b.xp - a.xp);

    return c.json(users.map((u, i) => ({ rank: i + 1, ...u })));
});

route.post("/gamification/check-streak", async (c) => {
    const user = getAuthUser(c);
    const userId = user.id;

    const db = c.get("db");
    const dbUser = await db.user.findUnique({ where: { id: userId } });
    if (!dbUser) return c.json({ error: "User not found" }, 404);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastLogin = dbUser.lastLoginAt
        ? new Date(
              dbUser.lastLoginAt.getFullYear(),
              dbUser.lastLoginAt.getMonth(),
              dbUser.lastLoginAt.getDate(),
          )
        : null;

    let newStreak = dbUser.streak;

    if (!lastLogin) {
        newStreak = 1;
    } else {
        const diffDays = Math.round((today.getTime() - lastLogin.getTime()) / 86400000);
        if (diffDays === 1) newStreak = dbUser.streak + 1;
        else if (diffDays > 1) newStreak = 1;
    }

    await db.user.update({
        where: { id: userId },
        data: { streak: newStreak, lastLoginAt: now },
    });

    return c.json({ streak: newStreak, xp: dbUser.xp });
});

export default route;
