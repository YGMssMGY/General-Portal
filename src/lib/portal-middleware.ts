export const VALID_PORTALS = ["developers", "stuco"] as const;
export type Portal = (typeof VALID_PORTALS)[number];

export function getPortalFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const idx = c.indexOf("=");
        if (idx === -1) return [c, ""];
        return [c.slice(0, idx).trim(), c.slice(idx + 1).trim()];
      }),
  );

  return cookies["portal"] ?? null;
}

export function getPortalFromUrl(url: string): string | null {
  try {
    const { pathname } = new URL(url, "http://localhost");
    const match = pathname.match(/^\/(developers|stuco)(?:\/|$)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function validatePortal(
  portal: string | null,
): portal is Portal {
  return portal === "developers" || portal === "stuco";
}

export function setPortalCookie(response: Response, portal: string): void {
  const encoded = encodeURIComponent(portal);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.headers.append(
    "Set-Cookie",
    `portal=${encoded}; Path=/; HttpOnly; SameSite=Lax${secure}`,
  );
}
