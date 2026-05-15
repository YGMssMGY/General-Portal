import { initAuthConfig } from "@hono/auth-js";
import type { AuthConfig } from "@auth/core";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import Microsoft from "@auth/core/providers/microsoft-entra-id";
import Credentials from "@auth/core/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { env } from "./env.js";
import { db } from "./db.js";
import { prisma } from "./db.js";

export const authConfig = initAuthConfig(getAuthConfig);

function getAuthConfig(): AuthConfig {
  const providers: AuthConfig["providers"] = [];

  if (env.GITHUB_ID && env.GITHUB_SECRET) {
    providers.push(
      GitHub({ clientId: env.GITHUB_ID, clientSecret: env.GITHUB_SECRET }),
    );
  }
  if (env.GOOGLE_ID && env.GOOGLE_SECRET) {
    providers.push(
      Google({ clientId: env.GOOGLE_ID, clientSecret: env.GOOGLE_SECRET }),
    );
  }
  if (env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET) {
    providers.push(
      Microsoft({
        clientId: env.MICROSOFT_CLIENT_ID,
        clientSecret: env.MICROSOFT_CLIENT_SECRET,
      }),
    );
  }

  if (env.DEV_AUTH_PASSWORD) {
    providers.push(
      Credentials({
        id: "credentials",
        name: "Dev Login",
        credentials: {
          username: { label: "Username" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          const username = credentials?.username as string;
          const password = credentials?.password as string;
          if (
            username === env.DEV_AUTH_USERNAME &&
            password === env.DEV_AUTH_PASSWORD
          ) {
            const user = await prisma.userAccount.findUnique({
              where: { email: username },
            });
            if (user)
              return { id: user.id, email: user.email, name: user.displayName };
          }
          return null;
        },
      }),
    );
  }

  return {
    secret: env.AUTH_SECRET,
    basePath: "/api/auth",
    trustHost: true,
    adapter: PrismaAdapter(db),
    session: { strategy: "database" },
    providers,
    callbacks: {
      async session({ session, user }) {
        if (session.user) {
          (session.user as any).id = user.id;
          try {
            const membership = await db.membership.findFirst({
              where: { userId: user.id },
              include: {
                workspace: { select: { id: true, name: true } },
                permissions: { select: { permission: true } },
              },
            });
            if (membership) {
              (session.user as any).workspaceId = membership.workspace.id;
              (session.user as any).workspaceName = membership.workspace.name;
              (session.user as any).role = membership.accessLabel.toLowerCase();
              (session.user as any).permissions = membership.permissions.map(
                (p) => p.permission,
              );
              return session;
            }
          } catch {
            // DB not available
          }
          (session.user as any).workspaceId = "ws-default";
          (session.user as any).workspaceName = "General Portal";
          (session.user as any).role = "admin";
          (session.user as any).permissions = ["*"];
        }
        return session;
      },
    },
  };
}
