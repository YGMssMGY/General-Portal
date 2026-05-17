import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PageTransition } from "./PageTransition";

describe("PageTransition", () => {
  it("renders children", () => {
    render(
      <PageTransition>
        <p>Hello World</p>
      </PageTransition>,
    );
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("renders multiple children", () => {
    render(
      <PageTransition>
        <span>First</span>
        <span>Second</span>
      </PageTransition>,
    );
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("renders without crashing with empty children", () => {
    const { container } = render(<PageTransition>{null}</PageTransition>);
    expect(container.firstChild).not.toBeNull();
  });
});
