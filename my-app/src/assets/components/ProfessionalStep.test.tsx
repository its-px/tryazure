import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { stubColors } from "../../test/setup";

vi.mock("../../hooks/useResolvedColors", () => ({
  useResolvedColors: () => stubColors,
}));

import ProfessionalStep from "./ProfessionalStep";
import type { ProfessionalOption } from "./professionalsService";

const pros = [
  { id: "1", code: "anna", name: "Anna Smith" },
  { id: "2", code: "bob", name: "Bob" },
] as ProfessionalOption[];

describe("ProfessionalStep", () => {
  it("shows the empty-state message when there are no professionals", () => {
    render(
      <ProfessionalStep selectedProfessional={null} onProfessionalSelect={() => {}} professionals={[]} />,
    );
    expect(screen.getByText("No professionals available for this tenant.")).toBeInTheDocument();
  });

  it("renders each professional's name and initials", () => {
    render(
      <ProfessionalStep selectedProfessional={null} onProfessionalSelect={() => {}} professionals={pros} />,
    );
    expect(screen.getByText("Anna Smith")).toBeInTheDocument();
    expect(screen.getByText("AS")).toBeInTheDocument(); // two-word initials
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument(); // single-word initial
  });

  it("fires onProfessionalSelect with the professional's code", async () => {
    const onSelect = vi.fn();
    render(
      <ProfessionalStep selectedProfessional={null} onProfessionalSelect={onSelect} professionals={pros} />,
    );
    await userEvent.click(screen.getByText("Anna Smith"));
    expect(onSelect).toHaveBeenCalledWith("anna");
  });
});
