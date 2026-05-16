import { render, screen } from "@testing-library/react";
import { Card } from "./Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Hello World</Card>);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it('applies padding="sm" as 1rem', () => {
    render(<Card padding="sm">Content</Card>);
    const tile = screen.getByText("Content").closest(".cds--tile");
    expect(tile).toHaveStyle({ padding: "1rem" });
  });

  it('applies padding="md" as 1.5rem', () => {
    render(<Card padding="md">Content</Card>);
    const tile = screen.getByText("Content").closest(".cds--tile");
    expect(tile).toHaveStyle({ padding: "1.5rem" });
  });

  it('applies padding="lg" as 2rem', () => {
    render(<Card padding="lg">Content</Card>);
    const tile = screen.getByText("Content").closest(".cds--tile");
    expect(tile).toHaveStyle({ padding: "2rem" });
  });
});
