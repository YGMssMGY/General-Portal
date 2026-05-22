import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

const { mockUseAuth } = vi.hoisted(() => ({
    mockUseAuth: vi.fn(() => ({
        user: {
            id: "1",
            email: "dev.member@generalportal.local",
            displayName: "Test Member",
            role: "member",
            workspaceName: "Developers' Club",
            xp: 150,
            level: 2,
            streak: 5,
            permissions: [],
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        hasPermission: vi.fn(() => false),
        role: "member",
    })),
}));

vi.mock("../../context/AuthContext", () => ({
    useAuth: mockUseAuth,
}));

vi.mock("../../hooks/useAuth", () => ({
    useAuth: mockUseAuth,
}));

vi.mock("../../api/workspaceApi", () => ({
    workspaceApi: {
        getAdminUsers: vi.fn().mockResolvedValue([]),
        getLeaderboard: vi.fn().mockResolvedValue([]),
        getKudos: vi.fn().mockResolvedValue([]),
    },
}));

vi.mock("../../config/clientConfig", () => ({
    getClientConfig: () => ({
        displayName: "Developers' Club",
        shortName: "DC",
        features: {},
    }),
}));

vi.mock("../../stores/useUIStore", () => ({
    useUIStore: (sel: any) => sel?.({ portal: "developers" }) ?? "developers",
}));

import { AccountsPage } from "./AccountsPage";

function renderWithRouter(el: React.ReactElement) {
    return render(<MemoryRouter>{el}</MemoryRouter>);
}

describe("AccountsPage", () => {
    it("renders without crashing", () => {
        renderWithRouter(<AccountsPage />);
        expect(screen.getByText("Account")).toBeInTheDocument();
    });

    it('shows "Your Account" section', () => {
        renderWithRouter(<AccountsPage />);
        expect(screen.getByText("Your Account")).toBeInTheDocument();
    });

    it("shows user display name", () => {
        renderWithRouter(<AccountsPage />);
        expect(screen.getByText("Test Member")).toBeInTheDocument();
    });

    it("shows user role as tag", () => {
        renderWithRouter(<AccountsPage />);
        expect(screen.getByText("Member")).toBeInTheDocument();
    });

    it("shows user email", () => {
        renderWithRouter(<AccountsPage />);
        expect(screen.getByText("dev.member@generalportal.local")).toBeInTheDocument();
    });

    it("shows user workspace name", () => {
        renderWithRouter(<AccountsPage />);
        expect(screen.getByText("Developers' Club")).toBeInTheDocument();
    });
});
