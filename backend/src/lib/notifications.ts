import { PrismaClient } from "@prisma/client";
import { broadcast } from "./websocket.js";
import { sendTeamsMessage } from "./teams.js";

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

  broadcast(workspaceId, {
    type: "notification",
    notification,
  });

  const settings = await db.workspaceSettings.findUnique({
    where: { workspaceId },
  });
  if (settings?.teamsWebhookUrl) {
    sendTeamsMessage(settings.teamsWebhookUrl, title, body).catch(() => {});
  }

  return notification;
}
