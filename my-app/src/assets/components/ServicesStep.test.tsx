import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { stubColors } from "../../test/setup";

const fetchServices = vi.fn();
let tenant: { id: string } | null = { id: "t1" };

vi.mock("../../hooks/useResolvedColors", () => ({
  useResolvedColors: () => stubColors,
}));
vi.mock("./servicesService", () => ({
  fetchServices: (...args: unknown[]) => fetchServices(...args),
}));
vi.mock("../../context/useTenantContext", () => ({
  useTenantContext: () => ({ tenant }),
}));

import ServicesStep from "./ServicesStep";

const services = [
  { id: "s1", name: "Haircut", duration_minutes: 30, price: 20, description: "" },
  { id: "s2", name: "Color", duration_minutes: 90, price: 60, description: "full color" },
];

beforeEach(() => {
  fetchServices.mockReset();
  tenant = { id: "t1" };
});

describe("ServicesStep", () => {
  it("renders fetched services after loading", async () => {
    fetchServices.mockResolvedValue(services);
    render(<ServicesStep selectedServices={[]} onServiceToggle={() => {}} />);

    expect(await screen.findByText("Haircut")).toBeInTheDocument();
    expect(screen.getByText("Color")).toBeInTheDocument();
    expect(fetchServices).toHaveBeenCalledWith("t1");
  });

  it("shows the empty state when no services come back", async () => {
    fetchServices.mockResolvedValue([]);
    render(<ServicesStep selectedServices={[]} onServiceToggle={() => {}} />);
    expect(await screen.findByText("No services available")).toBeInTheDocument();
  });

  it("does not call fetchServices when there is no tenant", async () => {
    tenant = null;
    render(<ServicesStep selectedServices={[]} onServiceToggle={() => {}} />);
    await waitFor(() => expect(screen.getByText("No services available")).toBeInTheDocument());
    expect(fetchServices).not.toHaveBeenCalled();
  });

  it("toggles a service on click and shows the selected count", async () => {
    fetchServices.mockResolvedValue(services);
    const onToggle = vi.fn();
    render(<ServicesStep selectedServices={["s1"]} onServiceToggle={onToggle} />);

    await userEvent.click(await screen.findByText("Color"));
    expect(onToggle).toHaveBeenCalledWith("s2");
    // one selected -> singular label
    expect(screen.getByText("1 service selected")).toBeInTheDocument();
  });

  it("pluralizes the selected count", async () => {
    fetchServices.mockResolvedValue(services);
    render(<ServicesStep selectedServices={["s1", "s2"]} onServiceToggle={() => {}} />);
    expect(await screen.findByText("2 services selected")).toBeInTheDocument();
  });
});
