import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { stubColors } from "../../test/setup";

// Minimal supabase surface — the no-session path never actually queries.
vi.mock("./supabaseClient", () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: () => ({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
    }),
  },
}));
vi.mock("../../hooks/useResolvedColors", () => ({
  useResolvedColors: () => stubColors,
}));
vi.mock("../../context/useTenantContext", () => ({
  useTenantContext: () => ({ tenant: { id: "t1" } }),
}));

import UserAccountPage from "./UserAccountPage";

beforeEach(() => localStorage.clear());

describe("UserAccountPage", () => {
  it("prompts the visitor to log in when there is no stored session", async () => {
    render(<UserAccountPage />);
    expect(
      await screen.findByText("Please login to view your account and booking history"),
    ).toBeInTheDocument();
  });
});
