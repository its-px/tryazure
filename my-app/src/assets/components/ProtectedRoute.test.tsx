import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProtectedRoute from "./ProtectedRoute";

// Navigate would need a Router; stub it to a visible marker instead.
vi.mock("react-router-dom", () => ({
  Navigate: ({ to }: { to: string }) => <div>REDIRECT:{to}</div>,
}));

// LoadingScreen pulls in Redux/tenant context that isn't set up in this
// unit test — stub it since ProtectedRoute only cares that it renders.
vi.mock("./LoadingScreen", () => ({
  default: () => <div data-testid="loading-screen">Loading...</div>,
}));

const child = <div>SECRET</div>;

describe("ProtectedRoute", () => {
  it("shows a loading placeholder while auth resolves", () => {
    render(
      <ProtectedRoute session={null} role={null} allowedRoles={["user"]} loading>
        {child}
      </ProtectedRoute>,
    );
    expect(screen.getByTestId("loading-screen")).toBeInTheDocument();
    expect(screen.queryByText("SECRET")).not.toBeInTheDocument();
  });

  it("redirects to / when there is no session", () => {
    render(
      <ProtectedRoute session={null} role="user" allowedRoles={["user"]} loading={false}>
        {child}
      </ProtectedRoute>,
    );
    expect(screen.getByText("REDIRECT:/")).toBeInTheDocument();
  });

  it("denies access when the role is not allowed", () => {
    render(
      <ProtectedRoute session={{ id: 1 }} role="user" allowedRoles={["admin"]} loading={false}>
        {child}
      </ProtectedRoute>,
    );
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(screen.queryByText("SECRET")).not.toBeInTheDocument();
  });

  it("denies access when role is null", () => {
    render(
      <ProtectedRoute session={{ id: 1 }} role={null} allowedRoles={["user"]} loading={false}>
        {child}
      </ProtectedRoute>,
    );
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
  });

  it("renders the child when session and role are valid", () => {
    render(
      <ProtectedRoute session={{ id: 1 }} role="admin" allowedRoles={["admin", "owner"]} loading={false}>
        {child}
      </ProtectedRoute>,
    );
    expect(screen.getByText("SECRET")).toBeInTheDocument();
  });
});
