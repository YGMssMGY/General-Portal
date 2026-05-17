import { db } from "./db.js";
import { broadcast } from "./websocket.js";

export async function createNotification(
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

  return notification;
}
