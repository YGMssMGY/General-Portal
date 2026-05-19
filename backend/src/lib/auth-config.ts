import { initAuthConfig } from "@hono/auth-js";
import type { AuthConfig } from "@auth/core";
import type { Context } from "hono";
import Microsoft from "@auth/core/providers/microsoft-entra-id";
import Credentials from "@auth/core/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { sign } from "hono/jwt";
import { env, IS_PRODUCTION } from "./env.js";
import { getDb } from "./db.js";

export const authConfig = initAuthConfig(getAuthConfig);

function getAuthConfig(c: Context): AuthConfig {
	const db: any = c.get("db") || getDb("developers");
	if (!db || !db.user) {
		console.error("[auth] PrismaClient not available — auth requests will fail");
	}

	const providers: AuthConfig["providers"] = [];

	if (env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET && env.MICROSOFT_TENANT_ID) {
		providers.push(
			Microsoft({
				clientId: env.MICROSOFT_CLIENT_ID,
				clientSecret: env.MICROSOFT_CLIENT_SECRET,
				issuer: `https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/v2.0`,
			}),
		);
	}

	if (!IS_PRODUCTION) {
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
						const user = await db.user.findUnique({ where: { email } });
						if (!user) return null;
						if (user.password && pw !== user.password) return null;
						return { id: user.id, email: user.email, name: user.name };
					} catch {
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
					(token as any).workspaceId = (token as any).workspaceId || "ws-default";
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
