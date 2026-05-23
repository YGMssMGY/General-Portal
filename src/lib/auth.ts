import NextAuth from "next-auth"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
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

export const { handlers: { GET, POST }, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    MicrosoftEntraID({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/v2.0`,
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
