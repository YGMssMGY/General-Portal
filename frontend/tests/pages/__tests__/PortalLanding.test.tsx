import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PortalLanding } from "../../../src/pages/PortalLanding";

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return { ...actual, useNavigate: () => mockNavigate };
});

describe("PortalLanding", () => {
    beforeEach(() => {
        mockNavigate.mockReset();
        // Clear portal cookie
        document.cookie = "portal=;path=/;max-age=0";
    });

    it("renders both portal options", () => {
        render(
            <MemoryRouter>
                <PortalLanding />
            </MemoryRouter>,
        );
        expect(screen.getByText("Student Council")).toBeInTheDocument();
        expect(screen.getByText("Developers Club")).toBeInTheDocument();
    });

    it("renders the main heading", () => {
        render(
            <MemoryRouter>
                <PortalLanding />
            </MemoryRouter>,
        );
        expect(screen.getByText("General Portal")).toBeInTheDocument();
    });

    it("renders description text", () => {
        render(
            <MemoryRouter>
                <PortalLanding />
            </MemoryRouter>,
        );
        expect(screen.getByText(/Choose your organization/)).toBeInTheDocument();
    });
});
