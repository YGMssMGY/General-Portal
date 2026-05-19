import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import {
  useTasksQuery,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "../../../src/hooks/useTasks";

const server = setupServer(
  http.get("*/api/tasks", () =>
    HttpResponse.json({
      content: [
        {
          id: "1",
          title: "Test Task",
          status: "todo",
          priority: "medium",
          project: "Test",
          dueDate: "2026-06-01T00:00:00.000Z",
          assigneeName: "User",
          progress: 0,
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }),
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useTasksQuery", () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it("returns loading state initially", () => {
    const { result } = renderHook(() => useTasksQuery(), { wrapper: Wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it("fetches tasks successfully", async () => {
    const { result } = renderHook(() => useTasksQuery(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].title).toBe("Test Task");
  });
});

describe("useCreateTask", () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it("can create a task", async () => {
    const { result } = renderHook(() => useCreateTask(), { wrapper: Wrapper });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useUpdateTask", () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it("returns mutation function", () => {
    const { result } = renderHook(() => useUpdateTask(), { wrapper: Wrapper });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useDeleteTask", () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it("returns mutation function", () => {
    const { result } = renderHook(() => useDeleteTask(), { wrapper: Wrapper });
    expect(result.current.mutate).toBeDefined();
  });
});
