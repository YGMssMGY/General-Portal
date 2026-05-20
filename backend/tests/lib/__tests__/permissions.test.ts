import { describe, it, expect } from "vitest";
import {
    ROLE_PERMISSIONS,
    getPermissionsForRole,
    hasPermission,
    hasAnyPermission,
} from "../../../src/lib/permissions.js";

describe("ROLE_PERMISSIONS", () => {
    it("defines all four roles", () => {
        expect(Object.keys(ROLE_PERMISSIONS)).toEqual(["admin", "president", "officer", "member"]);
    });

    it("admin has all permissions including delete", () => {
        const admin = ROLE_PERMISSIONS.admin;
        expect(admin).toContain("task:delete");
        expect(admin).toContain("settings:write");
        expect(admin).toContain("member:delete");
    });

    it("president has read+write but not delete on tasks", () => {
        const prez = ROLE_PERMISSIONS.president;
        expect(prez).toContain("task:read");
        expect(prez).toContain("task:write");
        expect(prez).not.toContain("task:delete");
    });

    it("officer has no finance:write or member:write", () => {
        const off = ROLE_PERMISSIONS.officer;
        expect(off).toContain("task:write");
        expect(off).not.toContain("finance:write");
        expect(off).not.toContain("member:write");
    });

    it("member is read-only on core resources", () => {
        const mem = ROLE_PERMISSIONS.member;
        expect(mem).toContain("task:read");
        expect(mem).toContain("event:read");
        expect(mem).not.toContain("task:write");
        expect(mem).not.toContain("finance:read");
    });
});

describe("getPermissionsForRole", () => {
    it("returns admin perms for admin role", () => {
        expect(getPermissionsForRole("admin")).toEqual(ROLE_PERMISSIONS.admin);
    });

    it("returns member perms for unknown role", () => {
        expect(getPermissionsForRole("unknown")).toEqual(ROLE_PERMISSIONS.member);
    });

    it("is case-insensitive", () => {
        expect(getPermissionsForRole("ADMIN")).toEqual(ROLE_PERMISSIONS.admin);
        expect(getPermissionsForRole("President")).toEqual(ROLE_PERMISSIONS.president);
    });
});

describe("hasPermission", () => {
    it("returns true for wildcard", () => {
        expect(hasPermission(["*"], "anything")).toBe(true);
    });

    it("returns true for matching permission", () => {
        expect(hasPermission(["task:read"], "task:read")).toBe(true);
    });

    it("returns false for non-matching permission", () => {
        expect(hasPermission(["task:read"], "task:write")).toBe(false);
    });
});

describe("hasAnyPermission", () => {
    it("returns true if user has at least one", () => {
        expect(hasAnyPermission(["task:read"], ["task:read", "task:write"])).toBe(true);
    });

    it("returns false if user has none", () => {
        expect(hasAnyPermission(["event:read"], ["task:read", "task:write"])).toBe(false);
    });
});
