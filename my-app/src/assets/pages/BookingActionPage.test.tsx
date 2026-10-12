import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { stubColors } from "../../test/setup";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("../../hooks/useResolvedColors", () => ({ useResolvedColors: () => stubColors }));
vi.mock("../components/supabaseClient", () => ({ supabase: { functions: { invoke } } }));

import BookingActionPage from "./BookingActionPage";

const open = (qs: string) =>
  render(
    <MemoryRouter initialEntries={[`/booking-action${qs}`]}>
      <BookingActionPage />
    </MemoryRouter>,
  );

beforeEach(() => invoke.mockReset());

describe("BookingActionPage", () => {
  it("does nothing on load (link scanners must not cancel), only after the button is pressed", async () => {
    invoke.mockResolvedValue({ data: { success: true, status: "cancelled" }, error: null });
    open("?token=t1&action=cancel");
    await new Promise((r) => setTimeout(r, 50));
    expect(invoke).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Yes, cancel booking" }));
    expect(invoke).toHaveBeenCalledWith("booking-sms-action", { body: { token: "t1", action: "cancel" } });
    await waitFor(() => expect(screen.getByText("Your booking has been cancelled.")).toBeInTheDocument());
  });

  it("rejects an invalid link without calling the server", () => {
    open("?token=t1&action=delete");
    expect(screen.getByText("This link is invalid.")).toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalled();
  });
});
