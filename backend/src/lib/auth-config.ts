import { initAuthConfig } from "@hono/auth-js";
import type { AuthConfig } from "@auth/core";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import Microsoft from "@auth/core/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { env } from "./env.js";
import { db } from "./db.js";

export const authConfig = initAuthConfig(getAuthConfig);

function getAuthConfig(): AuthConfig {
  return {
    secret: env.AUTH_SECRET,
    basePath: "/api/auth",
    trustHost: true,
    adapter: PrismaAdapter(db),
    session: { strategy: "database" },
    providers: [GitHub, Google, Microsoft],
    callbacks: {
      async session({ session, user }) {
        if (session.user) {
          session.user.id = user.id;
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
            // DB not available — use defaults
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
