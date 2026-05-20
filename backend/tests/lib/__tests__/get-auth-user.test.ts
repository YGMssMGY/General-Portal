import { describe, it, expect, vi } from "vitest";
import {
    getAuthUser,
    requireRole,
    requirePermission,
    AuthUser,
} from "../../../src/lib/get-auth-user.js";

function mockContext(userOverrides?: Partial<Record<string, unknown>>) {
    return {
        get: vi.fn((key: string) => {
            const defaults: Record<string, unknown> = {
                user: {
                    id: "user-1",
                    email: "test@test.com",
                    name: "Test User",
                    workspaceId: "ws-1",
                    role: "admin",
                    permissions: ["*"],
                },
            };
            return { ...defaults, ...userOverrides }[key];
        }),
    } as any;
}

describe("getAuthUser", () => {
    it("returns typed user from context", () => {
        const c = mockContext();
        const user = getAuthUser(c);

        expect(user.id).toBe("user-1");
        expect(user.email).toBe("test@test.com");
        expect(user.name).toBe("Test User");
        expect(user.workspaceId).toBe("ws-1");
        expect(user.role).toBe("admin");
        expect(user.permissions).toEqual(["*"]);
    });

    it("throws when no user in context", () => {
        const c = { get: vi.fn(() => undefined) } as any;
        expect(() => getAuthUser(c)).toThrow("Authentication required");
    });

    it("throws when user has no id", () => {
        const c = { get: vi.fn(() => ({ email: "test@test.com" })) } as any;
        expect(() => getAuthUser(c)).toThrow("Authentication required");
    });

    it("falls back for missing fields", () => {
        const c = { get: vi.fn(() => ({ id: "user-1" })) } as any;
        const user = getAuthUser(c);
        expect(user.email).toBe("");
        expect(user.name).toBe("Unknown");
        expect(user.role).toBe("member");
        expect(user.permissions).toEqual([]);
    });
});

describe("requireRole", () => {
    const admin: AuthUser = {
        id: "1",
        email: "a@b.com",
        name: "Admin",
        workspaceId: "ws-1",
        role: "admin",
        permissions: ["*"],
    };

    const member: AuthUser = {
        id: "2",
        email: "m@b.com",
        name: "Member",
        workspaceId: "ws-1",
        role: "member",
        permissions: ["task:read"],
    };

    it("passes when user has required role", () => {
        expect(() => requireRole(admin, "admin")).not.toThrow();
    });

    it("throws when user lacks required role", () => {
        expect(() => requireRole(member, "admin")).toThrow("Access denied");
    });

    it("passes when user has one of multiple required roles", () => {
        expect(() => requireRole(member, "admin", "member")).not.toThrow();
    });
});

describe("requirePermission", () => {
    const superAdmin: AuthUser = {
        id: "1",
        email: "a@b.com",
        name: "Admin",
        workspaceId: "ws-1",
        role: "admin",
        permissions: ["*"],
    };

    const reader: AuthUser = {
        id: "2",
        email: "r@b.com",
        name: "Reader",
        workspaceId: "ws-1",
        role: "member",
        permissions: ["task:read", "event:read"],
    };

    it("passes for wildcard permission", () => {
        expect(() => requirePermission(superAdmin, "anything")).not.toThrow();
    });

    it("passes when user has specific permission", () => {
        expect(() => requirePermission(reader, "task:read")).not.toThrow();
    });

    it("throws when user lacks permission", () => {
        expect(() => requirePermission(reader, "task:write")).toThrow("Access denied");
    });
});
