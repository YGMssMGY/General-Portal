import { vi } from "vitest";

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    workspaceId: string;
    role: string;
    permissions: string[];
}

const defaultUser: AuthUser = {
    id: "00000000-0000-0000-0000-000000000001",
    email: "admin@test.local",
    name: "Test Admin",
    workspaceId: "00000000-0000-0000-0000-000000000002",
    role: "admin",
    permissions: [
        "task:read",
        "task:write",
        "task:delete",
        "proposal:read",
        "proposal:write",
        "proposal:delete",
        "event:read",
        "event:write",
        "event:delete",
        "volunteer:read",
        "volunteer:write",
        "volunteer:delete",
        "finance:read",
        "finance:write",
        "finance:delete",
        "message:read",
        "message:write",
        "message:delete",
        "file:read",
        "file:write",
        "file:delete",
        "member:read",
        "member:write",
        "member:delete",
        "activity:read",
        "settings:read",
        "settings:write",
    ],
};

const ROLE_TOKENS: Record<string, string> = {
    admin: "mock-token-admin-abc123",
    president: "mock-token-president-def456",
    officer: "mock-token-officer-ghi789",
    member: "mock-token-member-jkl012",
};

/**
 * Create a mock Hono context that returns a typed auth user via c.get("user").
 * Useful for testing service functions or route handlers in isolation.
 */

export function createMockAuthContext(overrides?: Partial<AuthUser>): any {
    const user: AuthUser = { ...defaultUser, ...overrides };
    return {
        get: vi.fn((key: string) => {
            if (key === "user") return user;
            if (key === "workspaceId") return user.workspaceId;
            if (key === "portal") return "developers";
            return undefined;
        }),
        set: vi.fn(),
        var: vi.fn(),
        req: {
            header: vi.fn(),
            query: vi.fn(),
            param: vi.fn(),
        },
        json: vi.fn(),
        body: vi.fn(),
        text: vi.fn(),
        newResponse: vi.fn(),
        redirect: vi.fn(),
        res: vi.fn(),
    };
}

/**
 * Return a fake Bearer token string for a given role.
 * Not cryptographically valid — for test use only.
 */
export function createMockAuthHeader(role: keyof typeof ROLE_TOKENS = "admin"): string {
    return `Bearer ${ROLE_TOKENS[role] ?? ROLE_TOKENS["admin"]}`;
}

/**
 * Hono middleware that sets user, workspaceId, and portal on the context.
 * Use this in route tests to simulate an authenticated request.
 */

type HonoContext = Record<string, any>;

export function mockAuthMiddleware(userOverrides?: Partial<AuthUser>) {
    const user = { ...defaultUser, ...userOverrides };
    return async (c: HonoContext, next: () => Promise<void>) => {
        c.set("user", user);
        c.set("workspaceId", user.workspaceId);
        c.set("portal", "developers");
        await next();
    };
}
