import { initAuthConfig } from "@hono/auth-js";
import type { AuthConfig } from "@auth/core";
import type { Context } from "hono";
import Microsoft from "@auth/core/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { sign } from "hono/jwt";
import { env } from "./env.js";

export const authConfig = initAuthConfig(getAuthConfig);

async function getAuthConfig(c: Context): Promise<AuthConfig> {
	let db: any = c.get("db");
	if (!db) {
		const { getDb } = await import("./db.js");
		db = getDb("developers");
	}

	return {
		secret: env.AUTH_SECRET,
		basePath: "/api/auth",
		trustHost: true,
		adapter: PrismaAdapter(db),
		session: { strategy: "jwt" },
		providers: [
			Microsoft({
				clientId: env.MICROSOFT_CLIENT_ID,
				clientSecret: env.MICROSOFT_CLIENT_SECRET,
				issuer: `https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/v2.0`,
			}),
		],
		callbacks: {
			async signIn({ account, profile: p }) {
				if (account?.provider !== "microsoft-entra-id") return false;
				if (!p?.email) return false;
				const email = p.email.toLowerCase();
				const exists = await db.user.findUnique({ where: { email } });
				if (!exists) return false;
				if (p.name && p.name !== exists.name) {
					await db.user.update({ where: { email }, data: { name: p.name } });
				}
				return true;
			},
			async jwt({ token, user }) {
				if (user?.id) {
					(token as any).id = user.id;
					(token as any).email = user.email;
					(token as any).name = user.name;
					(token as any).workspaceId = "ws-default";
					(token as any).workspaceName = "General Portal";
					(token as any).role = "admin";
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
