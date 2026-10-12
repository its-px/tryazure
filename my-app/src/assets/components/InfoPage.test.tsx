import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { stubColors } from "../../test/setup";

vi.mock("../../hooks/useResolvedColors", () => ({ useResolvedColors: () => stubColors }));
vi.mock("../../context/useTenantContext", () => ({
  useTenantContext: () => ({ tenant: { name: "Gods Eye", config: {} } }),
}));

import InfoPage from "./InfoPage";
import type { ProfessionalOption } from "./professionalsService";

const pros = [
  { id: "1", code: "anna", name: "Anna Smith", tenant_id: "t1" },
  { id: "2", code: "bob", name: "Bob", tenant_id: "t1" },
] as ProfessionalOption[];

describe("InfoPage team section", () => {
  it("is hidden when there are no professionals", () => {
    render(<InfoPage />);
    expect(screen.queryByText("Our team")).not.toBeInTheDocument();
  });

  it("lists the team and starts a booking with the chosen professional", async () => {
    const onBookWith = vi.fn();
    render(<InfoPage professionals={pros} onBookWith={onBookWith} />);
    expect(screen.getByText("Our team")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Book with Anna" }));
    expect(onBookWith).toHaveBeenCalledWith("anna");
  });
});
