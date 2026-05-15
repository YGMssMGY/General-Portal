import { initAuthConfig } from "@hono/auth-js";
import type { AuthConfig } from "@auth/core";
import Credentials from "@auth/core/providers/credentials";
import { env } from "./env.js";
import { db } from "./db.js";

export const authConfig = initAuthConfig(getAuthConfig);

function getAuthConfig(): AuthConfig {
  return {
    secret: env.AUTH_SECRET,
    basePath: "/api/auth",
    trustHost: true,
    providers: [
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
            try {
              const user = await ensureDevUser(username);
              if (user)
                return {
                  id: user.id,
                  email: user.email,
                  name: user.displayName,
                };
            } catch {
              // DB not available — allow login with fallback identity
            }
            return { id: "dev-fallback", email: username, name: "Dev Admin" };
          }
          return null;
        },
      }),
    ],
    session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
    callbacks: {
      async jwt({ token, user }) {
        if (!user?.id) return token;
        (token as any).id = user.id;
        (token as any).email = user.email;
        (token as any).name = user.name;
        try {
          const membership = await db.membership.findFirst({
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
            return token;
          }
        } catch {
          // DB not available — use defaults
        }
        (token as any).workspaceId = "ws-default";
        (token as any).workspaceName = "General Portal";
        (token as any).role = "admin";
        (token as any).permissions = ["*"];
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          (session.user as any).id = token.sub;
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
  const existing = await db.userAccount.findUnique({ where: { email } });
  if (existing) return existing;

  const user = await db.userAccount.create({
    data: { email, displayName: "Dev Admin" },
  });
  const workspace = await db.workspace.findFirst();
  if (!workspace) return user;

  const membership = await db.membership.create({
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

  await db.permissionGrant.createMany({
    data: adminPerms.map((permission) => ({
      membershipId: membership.id,
      permission,
    })),
  });

  return user;
}
