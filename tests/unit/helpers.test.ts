import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor, isUuid, parsePagination } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth/passwords";
import { checkRateLimit, rateKey } from "@/lib/auth/rate-limit";
import {
    clearReturnToCookieHeader,
    portalCookieHeader,
    readReturnTo,
    returnToCookieHeader,
} from "@/lib/auth/session";
import { formatDateKey, getMonthGrid, getMonthName, isSameDay } from "@/lib/calendar-utils";
import { getDefaultPermissions } from "@/lib/permissions";
import { resolvePeriod } from "@/lib/participation";
import { fetchSafe } from "@/lib/ssrf";
import { clearSessionCookieHeader, sessionCookieHeader } from "@/lib/tenant";
import { stageDueAt } from "@/app/api/approvals/route";

function cookieReader(value?: string) {
    return {
        cookies: {
            get(name: string) {
                return name === "gp_next" && value !== undefined ? { value } : undefined;
            },
        },
    };
}

let bucketSequence = 0;
function uniqueRateKey(label: string): string {
    bucketSequence += 1;
    return rateKey(`203.0.113.${bucketSequence}`, label);
}

describe("password hashing", () => {
    it("verifies a correct password against the stored hash", async () => {
        const stored = await hashPassword("correct horse battery staple");
        expect(stored.startsWith("scrypt$v=1$n=32768$r=8$p=1$")).toBe(true);
        expect(await verifyPassword("correct horse battery staple", stored)).toBe(true);
    });

    it("rejects a wrong password", async () => {
        const stored = await hashPassword("s3cret-password");
        expect(await verifyPassword("wrong-password", stored)).toBe(false);
    });

    it("rejects malformed stored hashes", async () => {
        expect(await verifyPassword("anything", "not-a-hash")).toBe(false);
        expect(await verifyPassword("anything", "scrypt$v=1$n=32768$r=8$p=1$$$")).toBe(false);
    });
});

describe("return-to resolution", () => {
    it("accepts a safe relative path", () => {
        expect(readReturnTo(cookieReader(encodeURIComponent("/developers/dashboard")))).toBe(
            "/developers/dashboard",
        );
    });

    it("rejects protocol-relative, backslash, absolute and malformed values", () => {
        expect(readReturnTo(cookieReader(encodeURIComponent("//evil.example")))).toBeNull();
        expect(readReturnTo(cookieReader(encodeURIComponent("/\\evil.example")))).toBeNull();
        expect(readReturnTo(cookieReader(encodeURIComponent("https://evil.example")))).toBeNull();
        expect(readReturnTo(cookieReader("%"))).toBeNull();
        expect(readReturnTo(cookieReader())).toBeNull();
    });
});

describe("cookie headers", () => {
    it("builds a session cookie with the expected attributes", () => {
        const plain = sessionCookieHeader("token123", false);
        expect(plain).toContain("gp_session=token123");
        expect(plain).toContain("Path=/");
        expect(plain).toContain("HttpOnly");
        expect(plain).toContain("SameSite=Lax");
        expect(plain).toContain("Max-Age=86400");
        expect(plain).not.toContain("Secure");
        expect(sessionCookieHeader("token123", true)).toContain("Secure");
        expect(clearSessionCookieHeader()).toContain("Max-Age=0");
    });

    it("builds portal and return-to cookies", () => {
        const portal = portalCookieHeader("developers");
        expect(portal).toContain("portal=developers");
        expect(portal).toContain("Path=/");
        expect(portal).toContain("SameSite=Lax");
        expect(portal).not.toContain("HttpOnly");

        const returnTo = returnToCookieHeader("/developers/tasks?x=1");
        expect(returnTo).toContain("gp_next=%2Fdevelopers%2Ftasks%3Fx%3D1");
        expect(returnTo).toContain("HttpOnly");
        expect(returnTo).toContain("Max-Age=600");
        expect(clearReturnToCookieHeader()).toContain("gp_next=;");
        expect(clearReturnToCookieHeader()).toContain("Max-Age=0");
    });
});

describe("pagination parsing", () => {
    it("uses defaults for empty input", () => {
        expect(parsePagination(new URLSearchParams())).toEqual({
            limit: 50,
            cursor: null,
            page: 1,
        });
    });

    it("clamps limit into the 1..100 range and falls back on invalid values", () => {
        expect(parsePagination(new URLSearchParams("limit=5")).limit).toBe(5);
        expect(parsePagination(new URLSearchParams("limit=1000")).limit).toBe(100);
        expect(parsePagination(new URLSearchParams("limit=0")).limit).toBe(1);
        expect(parsePagination(new URLSearchParams("limit=abc")).limit).toBe(50);
    });

    it("keeps a valid cursor and clamps page to at least one", () => {
        const parsed = parsePagination(new URLSearchParams("cursor=abc&page=0"));
        expect(parsed.cursor).toBe("abc");
        expect(parsed.page).toBe(1);
        expect(parsePagination(new URLSearchParams("page=3")).page).toBe(3);
    });
});

describe("uuid validation", () => {
    it("accepts canonical uuids case-insensitively", () => {
        expect(isUuid("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
        expect(isUuid("123E4567-E89B-12D3-A456-426614174000")).toBe(true);
    });

    it("rejects malformed ids", () => {
        expect(isUuid("not-a-uuid")).toBe(false);
        expect(isUuid("123e4567e89b12d3a456426614174000")).toBe(false);
        expect(isUuid("")).toBe(false);
    });
});

describe("cursor codec", () => {
    it("round-trips an iso timestamp and an id", () => {
        const iso = "2026-01-02T03:04:05.000Z";
        expect(decodeCursor(encodeCursor(new Date(iso), "row-id"))).toEqual({
            createdAt: iso,
            id: "row-id",
        });
        expect(decodeCursor(encodeCursor(iso, "row-id"))).toEqual({
            createdAt: iso,
            id: "row-id",
        });
    });

    it("returns null for absent or invalid cursors", () => {
        expect(decodeCursor(null)).toBeNull();
        expect(decodeCursor("not-a-cursor")).toBeNull();
    });
});

describe("default permission hierarchy", () => {
    it("nests member inside officer inside admin", () => {
        const member = getDefaultPermissions("member");
        const officer = getDefaultPermissions("officer");
        const admin = getDefaultPermissions("admin");
        for (const permission of member) expect(officer).toContain(permission);
        for (const permission of officer) expect(admin).toContain(permission);
        expect(member).toContain("view_members");
        expect(officer).toContain("approve_proposal");
        expect(admin).toContain("view_audit");
    });

    it("withholds view_reports from members but grants it to officers and admins", () => {
        expect(getDefaultPermissions("member")).not.toContain("view_reports");
        expect(getDefaultPermissions("officer")).toContain("view_reports");
        expect(getDefaultPermissions("admin")).toContain("view_reports");
    });

    it("returns no permissions for an unknown role", () => {
        expect(getDefaultPermissions("does-not-exist")).toEqual([]);
    });
});

describe("in-memory rate limiter", () => {
    it("throws a 429 only after the allowance is exhausted", () => {
        const key = uniqueRateKey("unit-rate-limit");
        expect(() => checkRateLimit(key, 2, 60_000)).not.toThrow();
        expect(() => checkRateLimit(key, 2, 60_000)).not.toThrow();
        try {
            checkRateLimit(key, 2, 60_000);
            throw new Error("expected the limiter to throw");
        } catch (error) {
            expect((error as { status?: number }).status).toBe(429);
        }
    });

    it("isolates distinct buckets", () => {
        const a = uniqueRateKey("unit-isolation-a");
        const b = uniqueRateKey("unit-isolation-b");
        checkRateLimit(a, 1, 60_000);
        expect(() => checkRateLimit(b, 1, 60_000)).not.toThrow();
    });
});

describe("approval stage due dates", () => {
    it("returns null when no positive SLA is configured", () => {
        expect(stageDueAt({ name: "review" })).toBeNull();
        expect(stageDueAt({ name: "review", slaHours: 0 })).toBeNull();
        expect(stageDueAt({ name: "review", slaHours: -1 })).toBeNull();
    });

    it("adds the configured hours to the current time", () => {
        const before = Date.now();
        const due = stageDueAt({ name: "review", slaHours: 2 });
        const after = Date.now();
        expect(due).not.toBeNull();
        expect(due?.getTime()).toBeGreaterThanOrEqual(before + 2 * 3_600_000);
        expect(due?.getTime()).toBeLessThanOrEqual(after + 2 * 3_600_000);
    });
});

describe("calendar helpers", () => {
    it("lays out a month grid with the right number of days", () => {
        const grid = getMonthGrid(2026, 0);
        expect(grid.length).toBe(5);
        expect(grid[0]).toEqual([null, null, null, null, 1, 2, 3]);
        expect(grid.flat().filter((day) => day !== null).length).toBe(31);
    });

    it("formats and compares dates", () => {
        expect(formatDateKey(2026, 0, 5)).toBe("2026-01-05");
        expect(getMonthName(0).length).toBeGreaterThan(0);
        expect(getMonthName(0)).not.toBe(getMonthName(1));
        expect(isSameDay(new Date(2026, 0, 5, 1), new Date(2026, 0, 5, 23))).toBe(true);
        expect(isSameDay(new Date(2026, 0, 5), new Date(2026, 0, 6))).toBe(false);
    });
});

describe("participation period resolution", () => {
    it("resolves a calendar month", () => {
        const period = resolvePeriod("2026-03", "month");
        expect(period.start).toEqual(new Date(2026, 2, 1));
        expect(period.end).toEqual(new Date(2026, 3, 1));
    });

    it("resolves a calendar year", () => {
        const period = resolvePeriod("2026", "year");
        expect(period.start).toEqual(new Date(2026, 0, 1));
        expect(period.end).toEqual(new Date(2027, 0, 1));
    });

    it("resolves spring, summer and autumn terms", () => {
        expect(resolvePeriod("2026-02", "term")).toEqual({
            start: new Date(2026, 0, 1),
            end: new Date(2026, 4, 1),
        });
        expect(resolvePeriod("2026-05", "term")).toEqual({
            start: new Date(2026, 4, 1),
            end: new Date(2026, 8, 1),
        });
        expect(resolvePeriod("2026-09", "term")).toEqual({
            start: new Date(2026, 8, 1),
            end: new Date(2027, 0, 1),
        });
    });
});

describe("safe fetch blocking", () => {
    it("blocks non-http schemes", async () => {
        for (const url of ["file:///etc/passwd", "ftp://example.com/x", "javascript:alert(1)"]) {
            const result = await fetchSafe(url);
            expect(result.blocked, url).toBe(true);
            expect(result.ok, url).toBe(false);
        }
    });

    it("blocks literal private and loopback addresses without a network call", async () => {
        for (const url of ["http://127.0.0.1/", "http://[::1]/", "http://10.0.0.1/"]) {
            const result = await fetchSafe(url);
            expect(result.blocked, url).toBe(true);
            expect(result.ok, url).toBe(false);
        }
    });

    it("blocks embedded credentials", async () => {
        const result = await fetchSafe("http://user:pass@example.com/");
        expect(result.blocked).toBe(true);
    });
});
