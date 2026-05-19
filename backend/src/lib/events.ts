import { PrismaClient } from "@prisma/client";
import { broadcast } from "./websocket.js";

export async function emitEvent(
  db: PrismaClient,
  workspaceId: string,
  type: string,
  data: {
    actorName: string;
    action: string;
    resourceType: string;
    resourceTitle?: string;
    [key: string]: any;
  },
) {
  broadcast(workspaceId, { type, ...data });

  await db.activityLog.create({
    data: {
      workspaceId,
      actorName: data.actorName,
      action: data.action,
      resourceType: data.resourceType,
      resourceTitle: data.resourceTitle ?? null,
      occurredAt: new Date(),
    },
  });
}
