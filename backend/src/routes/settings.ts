import { Hono } from "hono";
import { prisma } from "../lib/db.js";

const route = new Hono();

route.get("/settings", async (c) => {
  const wid = c.get("workspaceId");
  let settings = await prisma.workspaceSettings.findUnique({
    where: { workspaceId: wid },
  });
  if (!settings) {
    settings = await prisma.workspaceSettings.create({
      data: { workspaceId: wid },
    });
  }
  return c.json(settings);
});

route.patch("/settings", async (c) => {
  const wid = c.get("workspaceId");
  const body = await c.req.json();
  const data: any = {};
  if (body.defaultVisibility !== undefined)
    data.defaultVisibility = body.defaultVisibility;
  if (body.requireProposalApproval !== undefined)
    data.requireProposalApproval = body.requireProposalApproval;
  if (body.allowMemberInvites !== undefined)
    data.allowMemberInvites = body.allowMemberInvites;
  if (body.fiscalYearStart !== undefined)
    data.fiscalYearStart = body.fiscalYearStart;

  const settings = await prisma.workspaceSettings.upsert({
    where: { workspaceId: wid },
    update: data,
    create: { workspaceId: wid, ...data },
  });
  return c.json(settings);
});

export default route;
