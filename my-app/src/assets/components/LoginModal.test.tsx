import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { stubColors } from "../../test/setup";

// --- Supabase mock ---------------------------------------------------------
const signUp = vi.fn();
const signInWithPassword = vi.fn();
const signInWithOAuth = vi.fn();
const resetPasswordForEmail = vi.fn();
const insert = vi.fn();
const invoke = vi.fn();
const single = vi.fn();

vi.mock("./supabaseClient", () => ({
  supabase: {
    auth: {
      signUp: (...a: unknown[]) => signUp(...a),
      signInWithPassword: (...a: unknown[]) => signInWithPassword(...a),
      signInWithOAuth: (...a: unknown[]) => signInWithOAuth(...a),
      resetPasswordForEmail: (...a: unknown[]) => resetPasswordForEmail(...a),
    },
    from: () => ({
      insert: (...a: unknown[]) => {
        insert(...a);
        return Promise.resolve({ error: null });
      },
      select: () => ({ eq: () => ({ single: () => single() }) }),
    }),
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
  },
}));
vi.mock("../../hooks/useResolvedColors", () => ({
  useResolvedColors: () => stubColors,
}));

import LoginModal from "./LoginModal";

const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

const openEmailForm = async () => {
  await userEvent.click(screen.getByText("CONTINUE WITH EMAIL"));
};
const switchToSignUp = async () => {
  await userEvent.click(screen.getByText(/Don't have an account\? Sign Up/i));
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LoginModal", () => {
  it("shows the Google + Email options first", () => {
    render(<LoginModal open onClose={() => {}} />);
    expect(screen.getByText("CONTINUE WITH GOOGLE")).toBeInTheDocument();
    expect(screen.getByText("CONTINUE WITH EMAIL")).toBeInTheDocument();
  });

  it("reveals the email form when Continue with Email is clicked", async () => {
    render(<LoginModal open onClose={() => {}} />);
    await openEmailForm();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/)).toBeInTheDocument();
  });

  it("rejects login submit until email + password are filled (button disabled)", async () => {
    render(<LoginModal open onClose={() => {}} />);
    await openEmailForm();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Email/), "a@gmail.com");
    await userEvent.type(screen.getByLabelText(/Password/), "secret");
    expect(screen.getByRole("button", { name: "Sign In" })).toBeEnabled();
  });

  it("blocks sign-up with a password under 6 chars", async () => {
    render(<LoginModal open onClose={() => {}} />);
    await openEmailForm();
    await switchToSignUp();
    await userEvent.type(screen.getByLabelText(/Full Name/), "Jo");
    await userEvent.type(screen.getByLabelText(/Phone/), "123456789");
    await userEvent.type(screen.getByLabelText(/Email/), "jo@gmail.com");
    await userEvent.type(screen.getByLabelText(/Password/), "123");
    // canSubmit keeps the button disabled for <6 char password
    expect(screen.getByRole("button", { name: "Create Account" })).toBeDisabled();
  });

  it("blocks sign-up with a disallowed email domain", async () => {
    render(<LoginModal open onClose={() => {}} />);
    await openEmailForm();
    await switchToSignUp();
    await userEvent.type(screen.getByLabelText(/Full Name/), "Jo");
    await userEvent.type(screen.getByLabelText(/Phone/), "123456789");
    await userEvent.type(screen.getByLabelText(/Email/), "jo@sketchy.ru");
    await userEvent.type(screen.getByLabelText(/Password/), "secret1");
    await userEvent.click(screen.getByRole("button", { name: "Create Account" }));
    expect(alertSpy).toHaveBeenCalledWith("Only common email domains allowed");
    expect(signUp).not.toHaveBeenCalled();
  });

  it("calls supabase.auth.signUp with valid sign-up data", async () => {
    signUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    invoke.mockResolvedValue({});
    render(<LoginModal open onClose={() => {}} />);
    await openEmailForm();
    await switchToSignUp();
    await userEvent.type(screen.getByLabelText(/Full Name/), "Jo Doe");
    await userEvent.type(screen.getByLabelText(/Phone/), "123456789");
    await userEvent.type(screen.getByLabelText(/Email/), "jo@gmail.com");
    await userEvent.type(screen.getByLabelText(/Password/), "secret1");
    await userEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: "jo@gmail.com", password: "secret1" }),
    );
  });

  it("logs in via signInWithPassword and stores the session", async () => {
    signInWithPassword.mockResolvedValue({
      data: {
        user: { id: "u1" },
        session: { access_token: "tok", refresh_token: "r", user: { id: "u1" } },
      },
      error: null,
    });
    single.mockResolvedValue({
      data: { role: "user", full_name: "Jo", phone: "123" },
      error: null,
    });
    render(<LoginModal open onClose={() => {}} />);
    await openEmailForm();
    await userEvent.type(screen.getByLabelText(/Email/), "jo@gmail.com");
    await userEvent.type(screen.getByLabelText(/Password/), "secret1");
    await userEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "jo@gmail.com",
      password: "secret1",
    });
    expect(localStorage.getItem("sb-auth-token")).toContain("tok");
  });

  it("forgot-password flow validates email then calls resetPasswordForEmail", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null });
    render(<LoginModal open onClose={() => {}} />);
    await openEmailForm();
    await userEvent.click(screen.getByText("Forgot Password?"));
    await userEvent.type(screen.getByLabelText(/Email/), "jo@gmail.com");
    await userEvent.click(screen.getByRole("button", { name: "Send Reset Email" }));
    expect(resetPasswordForEmail).toHaveBeenCalledWith(
      "jo@gmail.com",
      expect.any(Object),
    );
  });
});
