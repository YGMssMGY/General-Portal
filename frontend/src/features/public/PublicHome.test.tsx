import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PublicHome } from "./PublicHome";

vi.mock("../../config/clientConfig", () => ({
  getClientConfig: () => ({
    displayName: "Developers' Club",
    shortName: "DC",
    tagline: "Code. Create. Collaborate.",
    description: "A community of student developers building innovative projects.",
    primaryColor: "#0043ce",
    features: { showFinance: false, showVolunteers: true },
  }),
}));

describe("PublicHome", () => {
  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <PublicHome />
      </MemoryRouter>,
    );
    expect(screen.getByText("Developers' Club")).toBeInTheDocument();
  });

  it("contains the organization name", () => {
    render(
      <MemoryRouter>
        <PublicHome />
      </MemoryRouter>,
    );
    expect(screen.getByText("Developers' Club")).toBeInTheDocument();
    expect(screen.getByText("Code. Create. Collaborate.")).toBeInTheDocument();
  });
});
