import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

describe("ErrorBoundary", () => {
	it("renders children when no error", () => {
		render(
			<ErrorBoundary>
				<p>Safe content</p>
			</ErrorBoundary>,
		);
		expect(screen.getByText("Safe content")).toBeInTheDocument();
	});

	it("renders multiple children without crashing", () => {
		render(
			<ErrorBoundary>
				<span>First</span>
				<span>Second</span>
			</ErrorBoundary>,
		);
		expect(screen.getByText("First")).toBeInTheDocument();
		expect(screen.getByText("Second")).toBeInTheDocument();
	});

	it("catches render errors and shows fallback UI", () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const errorHandler = vi.fn((e) => e.preventDefault());
		window.addEventListener("error", errorHandler);

		function ThrowError() {
			throw new Error("Test render error");
		}

		render(
			<ErrorBoundary>
				<ThrowError />
			</ErrorBoundary>,
		);

		expect(screen.getByText("Something went wrong")).toBeInTheDocument();
		expect(screen.getByText("Test render error")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /reload page/i })).toBeInTheDocument();

		consoleSpy.mockRestore();
		window.removeEventListener("error", errorHandler);
	});
});
