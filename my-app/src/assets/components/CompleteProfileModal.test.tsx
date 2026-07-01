import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { stubColors } from "../../test/setup";

const getUser = vi.fn();
const updateUser = vi.fn();
const upsert = vi.fn();
const invoke = vi.fn();

vi.mock("./supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: () => getUser(),
      updateUser: (...a: unknown[]) => updateUser(...a),
    },
    from: () => ({ upsert: (...a: unknown[]) => upsert(...a) }),
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
  },
}));
vi.mock("../../hooks/useResolvedColors", () => ({
  useResolvedColors: () => stubColors,
}));

import CompleteProfileModal from "./CompleteProfileModal";

// window.location.reload is unimplemented in jsdom; stub it for the success path.
Object.defineProperty(window, "location", {
  value: { ...window.location, reload: vi.fn() },
  writable: true,
});

beforeEach(() => vi.clearAllMocks());

describe("CompleteProfileModal", () => {
  it("renders the mandatory-profile prompt", () => {
    render(<CompleteProfileModal open onClose={() => {}} />);
    expect(screen.getByText("Complete Your Profile")).toBeInTheDocument();
  });

  it("disables submit until both name and phone are filled", async () => {
    render(<CompleteProfileModal open onClose={() => {}} />);
    const btn = screen.getByRole("button", { name: "Complete Profile" });
    expect(btn).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/Full Name/), "Jo");
    expect(btn).toBeDisabled(); // phone still empty
    await userEvent.type(screen.getByLabelText(/Phone/), "123456789");
    expect(btn).toBeEnabled();
  });

  it("saves the profile via auth.updateUser + profiles.upsert", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u1", email: "jo@gmail.com" } },
      error: null,
    });
    updateUser.mockResolvedValue({ error: null });
    upsert.mockResolvedValue({ error: null });
    invoke.mockResolvedValue({});

    render(<CompleteProfileModal open onClose={() => {}} />);
    await userEvent.type(screen.getByLabelText(/Full Name/), "Jo Doe");
    await userEvent.type(screen.getByLabelText(/Phone/), "123456789");
    await userEvent.click(screen.getByRole("button", { name: "Complete Profile" }));

    expect(getUser).toHaveBeenCalled();
    expect(updateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ full_name: "Jo Doe", phone: "123456789" }),
      }),
    );
    expect(upsert).toHaveBeenCalled();
  });
});
