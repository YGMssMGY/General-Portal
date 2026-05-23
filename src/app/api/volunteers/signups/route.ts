import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const db = getDbFromCookie(request);

    const workspace = await db.workspace.findUnique({
      where: { slug: session.user.portal },
    });
    if (!workspace) return error("Workspace not found", 404);

    const body = await request.json();
    const { slotId } = body;
    if (!slotId) return error("slotId is required", 400);

    const slot = await db.volunteerSlot.findUnique({
      where: { id: slotId },
      include: { _count: { select: { signups: true } } },
    });

    if (!slot) return error("Volunteer slot not found", 404);
    if (slot.workspaceId !== workspace.id) return error("Slot does not belong to this workspace", 403);

    const existing = await db.volunteerSignup.findUnique({
      where: { slotId_userId: { slotId, userId: session.user.id } },
    });
    if (existing) return error("Already signed up for this slot", 409);

    if (slot._count.signups >= slot.capacity) {
      return error("Slot is at full capacity", 400);
    }

    const signup = await db.volunteerSignup.create({
      data: { slotId, userId: session.user.id },
    });

    await db.activityFeed.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "signed_up",
        entityType: "volunteer_signup",
        entityId: signup.id,
        metadata: { slotId, title: slot.title },
      },
    });

    return success(signup, 201);
  } catch (e) {
    console.error("POST /api/volunteers/signups", e);
    return error("Internal server error", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const db = getDbFromCookie(request);

    const body = await request.json();
    const { slotId } = body;
    if (!slotId) return error("slotId is required", 400);

    const signup = await db.volunteerSignup.findUnique({
      where: { slotId_userId: { slotId, userId: session.user.id } },
    });

    if (!signup) return error("Signup not found", 404);
    if (signup.userId !== session.user.id) return error("You can only remove your own signups", 403);

    await db.volunteerSignup.delete({
      where: { id: signup.id },
    });

    return success({ removed: true });
  } catch (e) {
    console.error("DELETE /api/volunteers/signups", e);
    return error("Internal server error", 500);
  }
}
