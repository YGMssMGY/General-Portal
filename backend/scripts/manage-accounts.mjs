import { PrismaClient } from "@prisma/client";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const projectRoot = resolve(root, "..");

// Load .env.production first (PostgreSQL), fallback to .env.local (SQLite)
const prodEnv = resolve(projectRoot, ".env.production");
const localEnv = resolve(projectRoot, ".env.local");

if (existsSync(prodEnv)) {
  dotenv.config({ path: prodEnv });
} else if (existsSync(localEnv)) {
  dotenv.config({ path: localEnv });
}

// Set DATABASE_URL if not already set
if (!process.env["DATABASE_URL"]) {
  const dbFile = "dev.db";
  process.env["DATABASE_URL"] = `file:./${dbFile}`;
}

const prisma = new PrismaClient();

// Permission sets matching seed.ts
function adminPerms() {
  return [
    "task:read",
    "task:write",
    "task:delete",
    "proposal:read",
    "proposal:write",
    "proposal:delete",
    "event:read",
    "event:write",
    "event:delete",
    "volunteer:read",
    "volunteer:write",
    "volunteer:delete",
    "finance:read",
    "finance:write",
    "finance:delete",
    "message:read",
    "message:write",
    "message:delete",
    "file:read",
    "file:write",
    "file:delete",
    "member:read",
    "member:write",
    "member:delete",
    "activity:read",
    "settings:read",
    "settings:write",
  ];
}

function presidentPerms() {
  return [
    "task:read",
    "task:write",
    "proposal:read",
    "proposal:write",
    "event:read",
    "event:write",
    "volunteer:read",
    "volunteer:write",
    "finance:read",
    "message:read",
    "message:write",
    "file:read",
    "member:read",
    "activity:read",
    "settings:read",
  ];
}

function officerPerms() {
  return [
    "task:read",
    "task:write",
    "proposal:read",
    "proposal:write",
    "event:read",
    "event:write",
    "volunteer:read",
    "message:read",
    "message:write",
    "file:read",
    "member:read",
    "activity:read",
  ];
}

function memberPerms() {
  return [
    "task:read",
    "event:read",
    "volunteer:read",
    "message:read",
    "file:read",
    "activity:read",
  ];
}

function getPermsForRole(role) {
  switch (role?.toLowerCase()) {
    case "admin":
      return adminPerms();
    case "president":
      return presidentPerms();
    case "officer":
      return officerPerms();
    case "member":
      return memberPerms();
    default:
      return memberPerms();
  }
}

async function findOrCreateWorkspace() {
  let workspace = await prisma.workspace.findFirst();
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: "General Portal Workspace",
        description: "Workspace auto-created by manage-accounts",
      },
    });
    console.log(`[manage-accounts] Created workspace: ${workspace.id}`);
  }
  return workspace;
}

async function createUser(email, displayName, role) {
  const workspace = await findOrCreateWorkspace();

  let user = await prisma.userAccount.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.userAccount.create({
      data: { email, displayName },
    });
    console.log(`[manage-accounts] Created user: ${email}`);
  } else {
    console.log(`[manage-accounts] User already exists: ${email}`);
  }

  // Check for existing membership
  const existing = await prisma.membership.findUnique({
    where: {
      workspaceId_userId: { workspaceId: workspace.id, userId: user.id },
    },
  });

  if (existing) {
    console.log(
      `[manage-accounts] Membership already exists for ${email} (${existing.accessLabel})`,
    );
    return;
  }

  const membership = await prisma.membership.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      position: role.charAt(0).toUpperCase() + role.slice(1),
      accessLabel: role.charAt(0).toUpperCase() + role.slice(1),
      taskCount: 0,
      volunteerHours: 0,
    },
  });

  const perms = getPermsForRole(role);
  await Promise.all(
    perms.map((perm) =>
      prisma.permissionGrant.create({
        data: { membershipId: membership.id, permission: perm },
      }),
    ),
  );

  console.log(
    `[manage-accounts] Created ${role} membership for ${email} with ${perms.length} permissions`,
  );
}

async function listUsers() {
  const users = await prisma.userAccount.findMany({
    include: {
      memberships: {
        include: { workspace: true, permissions: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (users.length === 0) {
    console.log("[manage-accounts] No users found");
    return;
  }

  console.log("[manage-accounts] Users:");
  for (const user of users) {
    const roles = user.memberships.map(
      (m) =>
        `${m.accessLabel} (ws: ${m.workspace.name}, ${m.permissions.length} perms)`,
    );
    console.log(
      `  ${user.email} — ${user.displayName} [${roles.join(", ") || "no membership"}]`,
    );
  }
}

async function deleteUser(email) {
  const user = await prisma.userAccount.findUnique({ where: { email } });
  if (!user) {
    console.log(`[manage-accounts] User not found: ${email}`);
    return;
  }

  await prisma.userAccount.delete({ where: { email } });
  console.log(`[manage-accounts] Deleted user: ${email} (${user.displayName})`);
}

function printUsage() {
  console.log(`
Usage:
  node scripts/manage-accounts.mjs create-admin <email> <name>
  node scripts/manage-accounts.mjs create-user <email> <name> <role>
  node scripts/manage-accounts.mjs list
  node scripts/manage-accounts.mjs delete <email>

Roles: admin, president, officer, member
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "create-admin": {
      if (args.length < 3) {
        printUsage();
        return;
      }
      await createUser(args[1], args[2], "admin");
      break;
    }
    case "create-user": {
      if (args.length < 4) {
        printUsage();
        return;
      }
      const role = args[3].toLowerCase();
      if (!["admin", "president", "officer", "member"].includes(role)) {
        console.error(`[manage-accounts] Invalid role: ${role}`);
        printUsage();
        return;
      }
      await createUser(args[1], args[2], role);
      break;
    }
    case "list":
      await listUsers();
      break;
    case "delete":
      if (args.length < 2) {
        printUsage();
        return;
      }
      await deleteUser(args[1]);
      break;
    default:
      printUsage();
  }
}

main()
  .catch((e) => {
    console.error("[manage-accounts] Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
