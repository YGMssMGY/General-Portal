import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

const { mockUseAuth, mockUseMeetings } = vi.hoisted(() => ({
	mockUseAuth: vi.fn(),
	mockUseMeetings: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
	useAuth: mockUseAuth,
}));

vi.mock("../../hooks/useWorkspaceResources", () => ({
	useMeetings: mockUseMeetings,
}));

vi.mock("../../api/workspaceApi", () => ({
	workspaceApi: {
		createMeeting: vi.fn(),
		updateMeeting: vi.fn(),
		deleteMeeting: vi.fn(),
		rsvpMeeting: vi.fn(),
	},
}));

vi.mock("../../components/Modal", () => ({
	Modal: ({
		title,
		isOpen,
		children,
	}: {
		title: string;
		isOpen: boolean;
		children: React.ReactNode;
	}) =>
		isOpen ? (
			<div data-testid="modal">
				{title}
				{children}
			</div>
		) : null,
}));

import { MeetingsPage } from "./MeetingsPage";

function renderPage() {
	return render(
		<MemoryRouter>
			<MeetingsPage />
		</MemoryRouter>,
	);
}

describe("MeetingsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseAuth.mockReturnValue({
			user: { id: "1", displayName: "Test User", role: "member", permissions: [] },
		});
	});

	it("renders loading state", () => {
		mockUseMeetings.mockReturnValue({
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
		mockUseMeetings.mockReturnValue({
			data: undefined,
			error: "Failed to load meetings",
			isLoading: false,
			refetch,
		});

		renderPage();
		expect(screen.getByText("Could not load data")).toBeInTheDocument();
		expect(screen.getByText("Failed to load meetings")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
	});

	it("renders empty state when no meetings", () => {
		mockUseMeetings.mockReturnValue({
			data: [],
			error: undefined,
			isLoading: false,
			refetch: vi.fn(),
		});

		renderPage();
		expect(screen.getByText("No meetings")).toBeInTheDocument();
	});

	it('shows "Meetings" in the page title', () => {
		mockUseMeetings.mockReturnValue({
			data: [
				{
					id: "1",
					title: "Sprint Planning",
					date: "2024-03-15",
					time: "10:00 AM",
					location: "Room 101",
					description: "Plan the sprint",
					agendaItems: ["Review backlog", "Assign tasks"],
					minutes: "",
					actionItems: [],
					status: "scheduled",
					organizerName: "Test User",
					attendeeCount: 5,
					rsvpStatus: "yes",
				},
			],
			error: undefined,
			isLoading: false,
			refetch: vi.fn(),
		});

		renderPage();
		expect(screen.getByText("Meetings")).toBeInTheDocument();
		expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
	});

	it("renders meeting details", () => {
		mockUseMeetings.mockReturnValue({
			data: [
				{
					id: "2",
					title: "Board Meeting",
					date: "2024-04-01",
					time: "2:00 PM",
					location: "Conference Room",
					description: "Monthly board meeting",
					agendaItems: ["Financial report"],
					minutes: "",
					actionItems: [],
					status: "scheduled",
					organizerName: "Admin",
					attendeeCount: 10,
					rsvpStatus: undefined,
				},
			],
			error: undefined,
			isLoading: false,
			refetch: vi.fn(),
		});

		renderPage();
		expect(screen.getByText("Board Meeting")).toBeInTheDocument();
		expect(screen.getByText("Conference Room")).toBeInTheDocument();
	});
});
