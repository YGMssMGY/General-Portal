import { describe, expect, it } from "vitest";
import { decodeCursorValues, encodeCursorValues } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { expandRecurrence, parseRecurrenceRule } from "@/lib/recurrence";
import { isBlockedIp } from "@/lib/ssrf";
import { fileKindMatchesMime, sniffFileKind } from "@/lib/uploads";
import { safeJsonLd } from "@/lib/seo";
import { executeAction } from "@/ops/engine";
import type { OpsContext } from "@/ops/types";

const ctx: OpsContext = {
    operatorId: "unit-test",
    source: "tui",
    scopes: ["ops:read", "ops:deploy", "ops:backup", "ops:danger"],
};

describe("cursor codec", () => {
    it("round-trips dates and ids", () => {
        const iso = "2026-01-02T03:04:05.000Z";
        const encoded = encodeCursorValues([iso, "abc"]);
        expect(decodeCursorValues(encoded)).toEqual([iso, "abc"]);
    });
    it("rejects invalid cursors", () => {
        expect(decodeCursorValues("not-base64!!")).toBeNull();
    });
});

describe("permissions", () => {
    const perms = [
        "view_members",
        "manage_users",
        "manage_settings",
        "manage_tasks",
        "manage_events",
        "manage_files",
        "manage_users",
    ];
    it("finds a granted permission", () => {
        expect(hasPermission(perms, "manage_users")).toBe(true);
    });
    it("denies a missing permission", () => {
        expect(hasPermission(perms, "view_audit")).toBe(false);
    });
});

describe("recurrence", () => {
    it("parses a weekly rule", () => {
        const rule = parseRecurrenceRule(JSON.stringify({ freq: "weekly", interval: 2, count: 3 }));
        expect(rule.freq).toBe("weekly");
        expect(rule.interval).toBe(2);
    });
    it("rejects an invalid rule", () => {
        expect(() => parseRecurrenceRule("{oops")).toThrow();
    });
    it("expands at most count occurrences", () => {
        const rule = JSON.stringify({ freq: "daily", count: 3 });
        const dates = expandRecurrence(
            { title: "t", startDate: new Date("2026-01-01T00:00:00Z"), recurrence: rule } as never,
            new Date("2026-01-01T00:00:00Z"),
            new Date("2026-01-10T00:00:00Z"),
        );
        expect(dates.length).toBe(3);
    });
});

describe("upload sniffing", () => {
    it("detects PNG, JPEG, PDF and text", () => {
        expect(
            sniffFileKind(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
        ).toBe("image/png");
        expect(sniffFileKind(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
        expect(sniffFileKind(new Uint8Array(Buffer.from("%PDF-1.7")))).toBe("application/pdf");
        expect(sniffFileKind(new Uint8Array(Buffer.from("hello world\n")))).toBe("text/plain");
        expect(sniffFileKind(new Uint8Array([0, 1, 2, 3]))).toBeNull();
    });
    it("matches declared mime", () => {
        expect(fileKindMatchesMime("image/png", "image/png")).toBe(true);
        expect(fileKindMatchesMime("image/png", "application/pdf")).toBe(false);
    });
});

describe("ssrf blocking", () => {
    it("blocks private and reserved ranges", () => {
        for (const ip of [
            "127.0.0.1",
            "10.0.0.1",
            "192.168.1.1",
            "172.16.0.1",
            "169.254.169.254",
            "100.64.0.1",
            "192.0.0.1",
            "198.18.0.1",
            "224.0.0.1",
            "::1",
            "fc00::1",
            "fe80::1",
            "::ffff:127.0.0.1",
        ]) {
            expect(isBlockedIp(ip), ip).toBe(true);
        }
    });
    it("allows public addresses", () => {
        expect(isBlockedIp("8.8.8.8")).toBe(false);
        expect(isBlockedIp("2606:4700:4700::1111")).toBe(false);
    });
});

describe("structured data safety", () => {
    it("escapes script-closing sequences", () => {
        const out = safeJsonLd({ name: "</script><script>alert(1)</script>" });
        expect(out).not.toContain("</script>");
        expect(out).toContain("\\u003c/script>");
    });
});

describe("operator engine", () => {
    it("requires typed confirmation for destructive actions", async () => {
        const result = await executeAction("user.revoke-all", { slug: "developers" }, ctx);
        expect(result.ok).toBe(false);
        if (!result.ok && result.status === "confirmation-required") {
            expect(result.confirmationToken).toBeTruthy();
        } else {
            throw new Error("expected confirmation-required");
        }
    });
    it("rejects unknown actions", async () => {
        const result = await executeAction("does.not.exist", {}, ctx);
        expect(result.ok).toBe(false);
    });
});
