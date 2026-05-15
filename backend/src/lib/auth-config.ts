import { initAuthConfig } from "@hono/auth-js";
import type { AuthConfig } from "@auth/core";
import Credentials from "@auth/core/providers/credentials";
import { env } from "./env.js";
import { prisma } from "./db.js";

export const authConfig = initAuthConfig(getAuthConfig);

function getAuthConfig(): AuthConfig {
  const providers: AuthConfig["providers"] = [];

  providers.push(
    Credentials({
      id: "credentials",
      name: "Dev Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username as string;
        const password = credentials?.password as string;

        if (
          username === env.DEV_AUTH_USERNAME &&
          password === env.DEV_AUTH_PASSWORD
        ) {
          const user = await ensureDevUser(username);
          return {
            id: user.id,
            email: user.email,
            name: user.displayName,
          };
        }

        return null;
      },
    }),
  );

  return {
    secret: env.AUTH_SECRET,
    trustHost: true,
    providers,
    session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
    callbacks: {
      async jwt({ token, user }) {
        if (user?.id) {
          const membership = await prisma.membership.findFirst({
            where: { userId: user.id },
            include: {
              workspace: { select: { id: true, name: true } },
              permissions: { select: { permission: true } },
            },
          });

          if (membership) {
            (token as any).workspaceId = membership.workspace.id;
            (token as any).workspaceName = membership.workspace.name;
            (token as any).role = membership.accessLabel.toLowerCase();
            (token as any).permissions = membership.permissions.map(
              (p) => p.permission,
            );
          }
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          (session.user as any).id = token.sub as string;
          (session.user as any).workspaceId = (token as any).workspaceId;
          (session.user as any).workspaceName = (token as any).workspaceName;
          (session.user as any).role = (token as any).role;
          (session.user as any).permissions = (token as any).permissions || [];
        }
        return session;
      },
    },
  };
}

async function ensureDevUser(email: string) {
  const existing = await prisma.userAccount.findUnique({ where: { email } });
  if (existing) return existing;

  const user = await prisma.userAccount.create({
    data: { email, displayName: "Dev Admin" },
  });

  const workspace = await prisma.workspace.findFirst();
  if (workspace) {
    const membership = await prisma.membership.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        position: "Admin",
        accessLabel: "Admin",
      },
    });

    const adminPerms = [
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

    await prisma.permissionGrant.createMany({
      data: adminPerms.map((permission) => ({
        membershipId: membership.id,
        permission,
      })),
    });
  }

  return user;
}
