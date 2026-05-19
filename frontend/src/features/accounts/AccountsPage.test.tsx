import { render, screen } from "@testing-library/react";
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

import { AccountsPage } from "./AccountsPage";

describe("AccountsPage", () => {
	it("renders without crashing", () => {
		render(<AccountsPage />);
		expect(screen.getByText("Account")).toBeInTheDocument();
	});

	it('shows "Your Account" section', () => {
		render(<AccountsPage />);
		expect(screen.getByText("Your Account")).toBeInTheDocument();
	});

	it("shows user display name", () => {
		render(<AccountsPage />);
		expect(screen.getByText("Test Member")).toBeInTheDocument();
	});

	it("shows user role as tag", () => {
		render(<AccountsPage />);
		expect(screen.getByText("Member")).toBeInTheDocument();
	});

	it("shows user email", () => {
		render(<AccountsPage />);
		expect(screen.getByText("dev.member@generalportal.local")).toBeInTheDocument();
	});

	it("shows user workspace name", () => {
		render(<AccountsPage />);
		expect(screen.getByText("Developers' Club")).toBeInTheDocument();
	});
});
