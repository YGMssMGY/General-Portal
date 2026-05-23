import NextAuth from "next-auth"
import { cookies } from "next/headers"
import { getDbForPortal } from "@/lib/db"
import { ROLE_PERMISSIONS } from "@/lib/permissions"
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      portal: string
      role: string
      permissions: string[]
    } & DefaultSession["user"]
  }
}

function DevConnect(config: { clientId: string; clientSecret: string }) {
  const issuer = process.env.DEVCONNECT_ISSUER!
  return {
    id: "devconnect",
    name: "DevConnect",
    type: "oauth" as const,
    checks: ["pkce", "state"],
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    authorization: {
      url: `${issuer}/api/oauth2/authorize`,
      params: { scope: "openid profile email" },
    },
    token: {
      url: `${issuer}/api/oauth2/token`,
      async request(context: any) {
        const url = new URL(`${issuer}/api/oauth2/token`)

        // This server expects token params (code, client_id, client_secret, code_verifier, etc.)
        // appended as query parameters instead of sent in the POST body.
        const bodyParams = new URLSearchParams(context.params)
        bodyParams.forEach((value, key) => {
          url.searchParams.set(key, value)
        })

        if (context.checks?.code_verifier) {
          url.searchParams.set("code_verifier", context.checks.code_verifier)
        }
        if (!url.searchParams.has("client_id")) {
          url.searchParams.set("client_id", context.provider.clientId)
        }
        if (!url.searchParams.has("client_secret") && context.provider.clientSecret) {
          url.searchParams.set("client_secret", context.provider.clientSecret)
        }

        console.log(url.toString)

        const response = await fetch(url.toString(), {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
        })

        if (!response.ok) {
          const text = await response.text()
          throw new Error(`Token endpoint error: ${response.status} ${text}`)
        }

        return await response.json()
      },
    },
    userinfo: `${issuer}/api/oauth2/userinfo`,
    profile(profile: any) {
      return {
        id: profile.sub ?? profile.id,
        name: profile.name,
        email: profile.email,
        image: profile.picture,
      }
    },
  }
}

export const { handlers: { GET, POST }, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    DevConnect({
      clientId: process.env.DEVCONNECT_CLIENT_ID!,
      clientSecret: process.env.DEVCONNECT_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false

      const cookieStore = await cookies()
      const portal = cookieStore.get("portal")?.value || "developers"
      if (!["developers", "stuco"].includes(portal)) return false

      const db = getDbForPortal(portal)
      const membership = await db.membership.findFirst({
        where: { user: { email: user.email } },
      })

      return !!membership
    },
    async jwt({ token, account, user }) {
      const cookieStore = await cookies()
      const portal = cookieStore.get("portal")?.value || "developers"

      const email = account ? (user?.email || token.email) : (token.email || null)

      if (email && (!token.userDbId || account)) {
        const db = getDbForPortal(portal)
        const dbUser = await db.user.findUnique({
          where: { email },
          include: {
            memberships: {
              include: { workspace: { select: { slug: true } } },
            },
          },
        })

        if (dbUser) {
          token.userDbId = dbUser.id
          const membership = dbUser.memberships.find((m) => m.workspace.slug === portal)
          if (membership) {
            token.portal = portal
            token.role = membership.role
            token.permissions = ROLE_PERMISSIONS[membership.role as keyof typeof ROLE_PERMISSIONS] ?? []
          }
        } else {
          try {
            const otherPortal = portal === "developers" ? "stuco" : "developers"
            const otherDb = getDbForPortal(otherPortal)
            const otherUser = await otherDb.user.findUnique({
              where: { email },
              include: {
                memberships: {
                  include: { workspace: { select: { slug: true } } },
                },
              },
            })
            if (otherUser) {
              token.userDbId = otherUser.id
              const membership = otherUser.memberships.find((m) => m.workspace.slug === otherPortal)
              if (membership) {
                token.portal = otherPortal
                token.role = membership.role
                token.permissions = ROLE_PERMISSIONS[membership.role as keyof typeof ROLE_PERMISSIONS] ?? []
              }
            }
          } catch {}
        }
      }

      if (!token.portal) {
        token.portal = portal
      }

      return token
    },
    async session({ session, token }) {
      session.user.id = (token.userDbId as string) || token.sub!
      session.user.portal = (token.portal as string) || "developers"
      session.user.role = (token.role as string) || "member"
      session.user.permissions = (token.permissions as string[]) || []
      return session
    },
  },
})
