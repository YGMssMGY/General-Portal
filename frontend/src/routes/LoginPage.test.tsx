import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "./LoginPage";

vi.mock("@hono/auth-js/react", () => ({
    useSession: () => ({ data: null, status: "unauthenticated" }),
    signIn: vi.fn(),
}));

vi.mock("../config/clientConfig", () => ({
    getClientConfig: () => ({
        displayName: "Student Portal",
        shortName: "SP",
        tagline: "Access your account",
        description: "Sign in to the student portal",
        primaryColor: "#0043ce",
        features: { showFinance: false, showVolunteers: false },
    }),
}));

describe("LoginPage", () => {
    it("renders the login form", () => {
        render(
            <MemoryRouter>
                <LoginPage />
            </MemoryRouter>,
        );
        expect(screen.getByRole("heading", { name: /general portal/i })).toBeInTheDocument();
    });

    it("has Microsoft sign in button", () => {
        render(
            <MemoryRouter>
                <LoginPage />
            </MemoryRouter>,
        );
        expect(screen.getByRole("button", { name: /sign in with microsoft/i })).toBeInTheDocument();
    });
});
