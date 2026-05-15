import { render, screen } from "@testing-library/react";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders the title text", () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<PageHeader title="Dashboard" description="Welcome back" />);
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  it("renders actions content when provided", () => {
    render(<PageHeader title="Dashboard" actions={<button>Create</button>} />);
    expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
  });

  it("does not render description when not provided", () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.queryByText("Welcome back")).not.toBeInTheDocument();
  });
});
