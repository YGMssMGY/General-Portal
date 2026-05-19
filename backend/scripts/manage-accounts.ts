import { PrismaClient } from "@prisma/client";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { getPermissionsForRole } from "../src/lib/permissions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const projectRoot = resolve(root, "..");

dotenv.config({ path: resolve(projectRoot, ".env") });

const dbUrl =
	process.env["DATABASE_URL_DEVELOPERS"] || "postgresql://localhost:5432/general_portal_dev";
process.env["DATABASE_URL"] = dbUrl;

const prisma = new PrismaClient({
	datasources: { db: { url: dbUrl } },
});

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

async function createUser(email: string, displayName: string, role: string) {
	const workspace = await findOrCreateWorkspace();

	let user = await prisma.user.findUnique({ where: { email } });
	if (!user) {
		user = await prisma.user.create({
			data: { email, displayName },
		});
		console.log(`[manage-accounts] Created user: ${email}`);
	} else {
		console.log(`[manage-accounts] User already exists: ${email}`);
	}

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

	const perms = getPermissionsForRole(role);
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
	const users = await prisma.user.findMany({
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
			(m) => `${m.accessLabel} (ws: ${m.workspace.name}, ${m.permissions.length} perms)`,
		);
		console.log(
			`  ${user.email} — ${user.displayName} [${roles.join(", ") || "no membership"}]`,
		);
	}
}

async function deleteUser(email: string) {
	const user = await prisma.user.findUnique({ where: { email } });
	if (!user) {
		console.log(`[manage-accounts] User not found: ${email}`);
		return;
	}

	await prisma.user.delete({ where: { email } });
	console.log(`[manage-accounts] Deleted user: ${email} (${user.displayName})`);
}

function printUsage() {
	console.log(`
Usage:
  npx tsx scripts/manage-accounts.ts create-admin <email> <name>
  npx tsx scripts/manage-accounts.ts create-user <email> <name> <role>
  npx tsx scripts/manage-accounts.ts list
  npx tsx scripts/manage-accounts.ts delete <email>

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
