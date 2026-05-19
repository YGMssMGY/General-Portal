import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUseAuth } = vi.hoisted(() => ({
	mockUseAuth: vi.fn(),
}));

vi.mock("../../hooks/useAuth", () => ({
	useAuth: mockUseAuth,
}));

vi.mock("../../api/workspaceApi", () => ({
	workspaceApi: {
		createAdminUser: vi.fn(),
	},
}));

import { AdminUserManager } from "./AdminUserManager";

describe("AdminUserManager", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders nothing when role is not admin", () => {
		mockUseAuth.mockReturnValue({
			user: {
				id: "1",
				displayName: "Test",
				email: "test@test.com",
				role: "member",
				permissions: [],
			},
		});

		const { container } = render(<AdminUserManager />);
		expect(container.innerHTML).toBe("");
	});

	it("renders nothing when user is null", () => {
		mockUseAuth.mockReturnValue({
			user: null,
		});

		const { container } = render(<AdminUserManager />);
		expect(container.innerHTML).toBe("");
	});

	it("renders the form when role is admin", () => {
		mockUseAuth.mockReturnValue({
			user: {
				id: "1",
				displayName: "Admin",
				email: "admin@test.com",
				role: "admin",
				permissions: [],
			},
		});

		render(<AdminUserManager />);

		expect(screen.getByText("Create User Account")).toBeInTheDocument();
		expect(screen.getByLabelText(/username \/ email/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /create user/i })).toBeInTheDocument();
	});

	it("disables submit button when form fields are empty", () => {
		mockUseAuth.mockReturnValue({
			user: {
				id: "1",
				displayName: "Admin",
				email: "admin@test.com",
				role: "admin",
				permissions: [],
			},
		});

		render(<AdminUserManager />);
		const button = screen.getByRole("button", { name: /create user/i });
		expect(button).toBeDisabled();
	});
});
