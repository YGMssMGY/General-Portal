import type { PrismaClient, Notification } from "@prisma/client";

type CreateNotificationParams = {
  workspaceId: string;
  userId: string;
  title: string;
  body?: string;
  type?: string;
  link?: string;
};

export async function createNotification(
  params: CreateNotificationParams,
  db: PrismaClient,
): Promise<Notification> {
  return db.notification.create({
    data: {
      workspaceId: params.workspaceId,
      userId: params.userId,
      title: params.title,
      body: params.body ?? null,
      type: params.type ?? "info",
      link: params.link ?? null,
    },
  });
}
