import { PrismaClient } from "@prisma/client";
import { sendTeamsMessage } from "./teams.js";

const webhookCache = new Map<string, { url: string; expiresAt: number }>();
const WEBHOOK_CACHE_TTL = 60_000; // 1 minute

async function getTeamsWebhookUrl(db: PrismaClient, workspaceId: string): Promise<string | null> {
	const cached = webhookCache.get(workspaceId);
	if (cached && cached.expiresAt > Date.now()) return cached.url;
	const settings = await db.workspaceSettings.findUnique({
		where: { workspaceId },
		select: { teamsWebhookUrl: true },
	});
	const url = settings?.teamsWebhookUrl || null;
	webhookCache.set(workspaceId, { url: url ?? "", expiresAt: Date.now() + WEBHOOK_CACHE_TTL });
	return url;
}

export async function createNotification(
	db: PrismaClient,
	workspaceId: string,
	userId: string,
	title: string,
	body: string,
	type: string,
	resourceType?: string,
	resourceId?: string,
) {
	const notification = await db.notification.create({
		data: {
			workspaceId,
			userId,
			title,
			body,
			type,
			resourceType: resourceType ?? null,
			resourceId: resourceId ?? null,
		},
	});

	const webhookUrl = await getTeamsWebhookUrl(db, workspaceId);
	if (webhookUrl) {
		sendTeamsMessage(webhookUrl, title, body).catch(() => {});
	}

	return notification;
}
