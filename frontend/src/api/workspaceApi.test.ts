import { describe, it, expect, vi } from "vitest";
import { workspaceApi } from "./workspaceApi";

const { mockFetchJson, mockFetchPage, mockJsonBody } = vi.hoisted(() => ({
    mockFetchJson: vi.fn(),
    mockFetchPage: vi.fn(),
    mockJsonBody: vi.fn((body: unknown) => ({ body: JSON.stringify(body) })),
}));

vi.mock("./httpClient", () => ({
    fetchJson: mockFetchJson,
    fetchPage: mockFetchPage,
    jsonBody: mockJsonBody,
    API_BASE_URL: "/api",
}));

describe("workspaceApi", () => {
    it("getTasks calls fetchPage with /tasks", () => {
        workspaceApi.getTasks();
        expect(mockFetchPage).toHaveBeenCalledWith("/tasks");
    });

    it("createTask calls fetchJson with POST method", () => {
        const task = {
            title: "Test task",
            priority: "high" as const,
            project: "Test",
            dueDate: "2024-12-31",
            assigneeName: "Alice",
        };
        workspaceApi.createTask(task);
        expect(mockFetchJson).toHaveBeenCalledWith("/tasks", {
            method: "POST",
            body: JSON.stringify(task),
        });
    });

    it("getMessageThreads calls fetchPage with /messages/threads", () => {
        workspaceApi.getMessageThreads();
        expect(mockFetchPage).toHaveBeenCalledWith("/messages/threads");
    });

    it("getCurrentUser calls fetchJson with /me", () => {
        workspaceApi.getCurrentUser();
        expect(mockFetchJson).toHaveBeenCalledWith("/me");
    });

    it("getDashboard calls fetchJson with /dashboard", () => {
        workspaceApi.getDashboard();
        expect(mockFetchJson).toHaveBeenCalledWith("/dashboard");
    });

    it("getMeetings calls fetchPage with /meetings", () => {
        workspaceApi.getMeetings();
        expect(mockFetchPage).toHaveBeenCalledWith("/meetings");
    });
});
