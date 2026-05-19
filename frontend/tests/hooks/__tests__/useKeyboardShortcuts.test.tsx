import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// Import after mock
const { useKeyboardShortcuts } = await import("../../../src/hooks/useKeyboardShortcuts");

describe("useKeyboardShortcuts", () => {
  function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter>{children}</MemoryRouter>;
  }

  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("renders without crashing", () => {
    const { result } = renderHook(() => useKeyboardShortcuts(), { wrapper: Wrapper });
    expect(result).toBeDefined();
  });
});
