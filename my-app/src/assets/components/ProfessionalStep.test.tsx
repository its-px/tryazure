import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { stubColors } from "../../test/setup";

vi.mock("../../hooks/useResolvedColors", () => ({
  useResolvedColors: () => stubColors,
}));

vi.mock("./professionalsService", () => ({ getNextAvailableSlot: vi.fn(async () => null) }));

import ProfessionalStep from "./ProfessionalStep";
import { getNextAvailableSlot, type ProfessionalOption } from "./professionalsService";

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

  it("shows an Any professional option, selected by default (null)", () => {
    render(
      <ProfessionalStep selectedProfessional={null} onProfessionalSelect={() => {}} professionals={pros} />,
    );
    expect(screen.getByText("Any professional")).toBeInTheDocument();
  });

  it("hides the Any professional card when anyProfessionalEnabled is false", () => {
    render(
      <ProfessionalStep selectedProfessional={null} onProfessionalSelect={() => {}} professionals={pros} anyProfessionalEnabled={false} />,
    );
    expect(screen.queryByText("Any professional")).not.toBeInTheDocument();
    expect(screen.getByText("Anna Smith")).toBeInTheDocument();
  });

  it("fires onProfessionalSelect with null when Any professional is picked", async () => {
    const onSelect = vi.fn();
    render(
      <ProfessionalStep selectedProfessional="anna" onProfessionalSelect={onSelect} professionals={pros} />,
    );
    await userEvent.click(screen.getByText("Any professional"));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("Soonest appointment picks the professional with the earliest slot", async () => {
    const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString("sv");
    vi.mocked(getNextAvailableSlot).mockImplementation(async (code: string) =>
      code === "anna"
        ? { date: tomorrow, start_time: "14:00:00", end_time: "14:30:00" }
        : { date: tomorrow, start_time: "10:00:00", end_time: "10:30:00" },
    );
    const onSoonest = vi.fn();
    const withTenant = pros.map((p) => ({ ...p, tenant_id: "t1" }));
    render(
      <ProfessionalStep selectedProfessional={null} onProfessionalSelect={() => {}} professionals={withTenant} onSoonest={onSoonest} />,
    );
    await userEvent.click(await screen.findByRole("button", { name: /Soonest appointment/ }));
    await waitFor(() =>
      expect(onSoonest).toHaveBeenCalledWith({
        professionalCode: "bob",
        date: tomorrow,
        slot: { start_time: "10:00:00", end_time: "10:30:00" },
      }),
    );
  });
});
