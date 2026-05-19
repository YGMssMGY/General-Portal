import { initAuthConfig } from "@hono/auth-js";
import type { AuthConfig } from "@auth/core";
import Microsoft from "@auth/core/providers/microsoft-entra-id";
import Credentials from "@auth/core/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { sign } from "hono/jwt";
import { env, IS_PRODUCTION } from "./env.js";
import { getDb } from "./db.js";

export const authConfig = initAuthConfig(getAuthConfig);

function getAuthConfig(): AuthConfig {
  const db = getDb("developers");
  const providers: AuthConfig["providers"] = [];

  if (IS_PRODUCTION) {
    if (
      env.MICROSOFT_CLIENT_ID &&
      env.MICROSOFT_CLIENT_SECRET &&
      env.MICROSOFT_TENANT_ID
    ) {
      providers.push(
        Microsoft({
          clientId: env.MICROSOFT_CLIENT_ID,
          clientSecret: env.MICROSOFT_CLIENT_SECRET,
          issuer: `https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/v2.0`,
        }),
      );
    }
  } else {
    if (
      env.MICROSOFT_CLIENT_ID &&
      env.MICROSOFT_CLIENT_SECRET &&
      env.MICROSOFT_TENANT_ID
    ) {
      providers.push(
        Microsoft({
          clientId: env.MICROSOFT_CLIENT_ID,
          clientSecret: env.MICROSOFT_CLIENT_SECRET,
          issuer: `https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/v2.0`,
        }),
      );
    }
    providers.push(
      Credentials({
        id: "credentials",
        name: "Dev Login",
        credentials: {
          username: { label: "Email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          const email = credentials?.username as string;
          const pw = credentials?.password as string;
          if (!email) return null;
          try {
            const user = await db.userAccount.findUnique({
              where: { email },
            });
            if (!user) return null;
            if (user.password) {
              if (pw !== user.password) return null;
            }
            return {
              id: user.id,
              email: user.email,
              name: user.displayName,
            };
          } catch (e) {
            console.error("[auth] authorize error:", e);
            return null;
          }
        },
      }),
    );
  }

  return {
    secret: env.AUTH_SECRET,
    basePath: "/api/auth",
    trustHost: true,
    adapter: PrismaAdapter(db),
    session: { strategy: "jwt" },
    providers,
    callbacks: {
      async jwt({ token, user }) {
        if (user?.id) {
          (token as any).id = user.id;
          (token as any).email = user.email;
          (token as any).name = user.name;
          try {
            const membership = await db.membership.findFirst({
              where: { userId: user.id },
            });
            if (membership) {
              (token as any).workspaceId = (membership as any).workspaceId;
              (token as any).role = membership.accessLabel?.toLowerCase();
            }
          } catch {
            /* DB not available */
          }
          (token as any).workspaceId =
            (token as any).workspaceId || "ws-default";
          (token as any).workspaceName = "General Portal";
          (token as any).role = (token as any).role || "admin";
          (token as any).permissions = ["*"];
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          (session.user as any).id = (token as any).id || token.sub;
          (session.user as any).workspaceId = (token as any).workspaceId;
          (session.user as any).workspaceName = (token as any).workspaceName;
          (session.user as any).role = (token as any).role;
          (session.user as any).permissions = (token as any).permissions || [];
        }
        const rawToken = await sign(token as any, env.AUTH_SECRET, "HS256");
        (session as any).token = rawToken;
        return session;
      },
    },
  };
}
