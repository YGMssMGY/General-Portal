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

const tenant = process.env.MICROSOFT_TENANT_ID || "common"

export const { handlers: { GET, POST }, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  jwt: {
    maxAge: 24 * 60 * 60,
  },
  providers: [
    MicrosoftEntraID({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${tenant}/v2.0`,
      authorization: {
        url: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
        params: { scope: "openid profile email" },
      },
      token: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
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
        select: { id: true },
      })

      return !!membership
    },
    async jwt({ token, account, user }) {
      if (account && user) {
        const cookieStore = await cookies()
        const portal = cookieStore.get("portal")?.value || "developers"
        token.portal = portal
      }

      if (!token.userDbId && token.email) {
        const cookieStore = await cookies()
        const portal = cookieStore.get("portal")?.value || "developers"

        const db = getDbForPortal(portal)
        const dbUser = await db.user.findUnique({
          where: { email: token.email },
          select: {
            id: true,
            memberships: {
              where: { workspace: { slug: portal } },
              select: { role: true },
            },
          },
        })

        if (dbUser) {
          token.userDbId = dbUser.id
          if (dbUser.memberships.length > 0) {
            token.role = dbUser.memberships[0].role
            token.permissions = ROLE_PERMISSIONS[dbUser.memberships[0].role as keyof typeof ROLE_PERMISSIONS] ?? []
          }
        }
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
