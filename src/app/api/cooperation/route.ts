import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const db = getDbFromCookie(request);
    const portal = (session.user as any).portal;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { workspaceId: workspace.id };
    if (status && typeof status === "string" && status.trim()) {
      where.status = status.trim();
    }

    const requests = await db.cooperationRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        submittedBy: { select: { id: true, name: true, email: true, image: true } },
        reviewedBy: { select: { id: true, name: true, image: true } },
      },
    });

    return success(requests);
  } catch (e) {
    console.error("GET /api/cooperation", e);
    return error("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const db = getDbFromCookie(request);
    const portal = (session.user as any).portal;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const body = await request.json();
    const { clubName, contactName, contactEmail, eventTitle, description, proposedDate, resourcesNeeded } = body;

    if (!clubName || typeof clubName !== "string" || !clubName.trim()) {
      return error("Club name is required", 400);
    }
    if (!contactName || typeof contactName !== "string" || !contactName.trim()) {
      return error("Contact name is required", 400);
    }
    if (!contactEmail || typeof contactEmail !== "string" || !contactEmail.trim()) {
      return error("Contact email is required", 400);
    }
    if (!eventTitle || typeof eventTitle !== "string" || !eventTitle.trim()) {
      return error("Event title is required", 400);
    }
    if (!description || typeof description !== "string" || !description.trim()) {
      return error("Description is required", 400);
    }

    let parsedDate: Date | null = null;
    if (proposedDate) {
      parsedDate = new Date(proposedDate);
      if (isNaN(parsedDate.getTime())) {
        return error("Invalid proposed date", 400);
      }
    }

    const cooperationRequest = await db.cooperationRequest.create({
      data: {
        workspaceId: workspace.id,
        clubName: clubName.trim(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        eventTitle: eventTitle.trim(),
        description: description.trim(),
        proposedDate: parsedDate,
        resourcesNeeded: resourcesNeeded?.trim() ?? null,
        status: "pending",
        submittedById: session.user.id,
      },
    });

    return success(cooperationRequest, 201);
  } catch (e) {
    console.error("POST /api/cooperation", e);
    return error("Internal server error", 500);
  }
}
