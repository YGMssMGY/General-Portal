import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

const { mockUseAuth, mockUseDashboard } = vi.hoisted(() => ({
	mockUseAuth: vi.fn(),
	mockUseDashboard: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
	useAuth: mockUseAuth,
}));

vi.mock("../../hooks/useWorkspaceResources", () => ({
	useDashboard: mockUseDashboard,
}));

import { DashboardPage } from "./DashboardPage";

function renderPage() {
	return render(
		<MemoryRouter>
			<DashboardPage />
		</MemoryRouter>,
	);
}

describe("DashboardPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseAuth.mockReturnValue({
			user: {
				id: "1",
				displayName: "Test User",
				email: "test@test.com",
				role: "member",
				permissions: [],
			},
			isAuthenticated: true,
			isLoading: false,
			error: null,
		});
	});

	it("renders loading state", () => {
		mockUseDashboard.mockReturnValue({
			data: undefined,
			error: undefined,
			isLoading: true,
			refetch: vi.fn(),
		});

		renderPage();
		expect(screen.getByText("Loading data")).toBeInTheDocument();
	});

	it("renders error state with retry button", () => {
		const refetch = vi.fn();
		mockUseDashboard.mockReturnValue({
			data: undefined,
			error: "Something went wrong",
			isLoading: false,
			refetch,
		});

		renderPage();
		expect(screen.getByText("Could not load data")).toBeInTheDocument();
		expect(screen.getByText("Something went wrong")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
	});

	it("renders greeting text when data loaded", () => {
		mockUseDashboard.mockReturnValue({
			data: {
				metrics: [
					{ label: "Open Tasks", value: "5", tone: "primary", icon: "Task" },
					{ label: "Pending Proposals", value: "2", tone: "tertiary", icon: "Document" },
				],
				attention: [],
				myTasks: [],
				upcomingEvents: [],
				recentActivity: [],
				stats: undefined,
			},
			error: undefined,
			isLoading: false,
			refetch: vi.fn(),
		});

		renderPage();
		expect(screen.getByText(/good (morning|afternoon|evening)/i)).toBeInTheDocument();
		expect(screen.getByText("Open Tasks")).toBeInTheDocument();
	});

	it("renders quick action links", () => {
		mockUseDashboard.mockReturnValue({
			data: {
				metrics: [{ label: "Open Tasks", value: "3", tone: "primary", icon: "Task" }],
				attention: [],
				myTasks: [],
				upcomingEvents: [],
				recentActivity: [],
				stats: undefined,
			},
			error: undefined,
			isLoading: false,
			refetch: vi.fn(),
		});

		renderPage();
		expect(screen.getByRole("link", { name: /new task/i })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /new proposal/i })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /my account/i })).toBeInTheDocument();
	});
});
