import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { PageTransition } from "./PageTransition";

describe("PageTransition", () => {
    function Wrapper({ children }: { children: React.ReactNode }) {
        return <MemoryRouter>{children}</MemoryRouter>;
    }

    it("renders children", () => {
        render(
            <PageTransition>
                <p>Hello World</p>
            </PageTransition>,
            { wrapper: Wrapper },
        );
        expect(screen.getByText("Hello World")).toBeInTheDocument();
    });

    it("renders multiple children", () => {
        render(
            <PageTransition>
                <span>First</span>
                <span>Second</span>
            </PageTransition>,
            { wrapper: Wrapper },
        );
        expect(screen.getByText("First")).toBeInTheDocument();
        expect(screen.getByText("Second")).toBeInTheDocument();
    });

    it("renders without crashing with empty children", () => {
        const { container } = render(<PageTransition>{null}</PageTransition>, { wrapper: Wrapper });
        expect(container.firstChild).not.toBeNull();
    });
});
