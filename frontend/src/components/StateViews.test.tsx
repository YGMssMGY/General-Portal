import { render, screen } from "@testing-library/react";
import { LoadingState, ErrorState } from "./StateViews";

describe("LoadingState", () => {
	it("renders with label text", () => {
		render(<LoadingState label="Fetching data..." />);
		expect(screen.getByText("Fetching data...")).toBeInTheDocument();
	});
});

describe("ErrorState", () => {
	it("renders message text", () => {
		render(<ErrorState message="Something went wrong" />);
		expect(screen.getByText("Something went wrong")).toBeInTheDocument();
	});

	it('renders "Try again" button when onRetry provided', () => {
		const onRetry = () => {};
		render(<ErrorState message="Failed to load" onRetry={onRetry} />);
		expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
	});

	it("does not render button when onRetry is not provided", () => {
		render(<ErrorState message="Failed to load" />);
		expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
	});
});
