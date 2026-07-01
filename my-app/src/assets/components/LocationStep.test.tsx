import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { stubColors } from "../../test/setup";

vi.mock("../../hooks/useResolvedColors", () => ({
  useResolvedColors: () => stubColors,
}));

import LocationStep from "./LocationStep";

describe("LocationStep", () => {
  it("renders both location options", () => {
    render(<LocationStep selectedLocation={null} onLocationSelect={() => {}} />);
    expect(screen.getByText("At Our Place")).toBeInTheDocument();
    expect(screen.getByText("At Your Place")).toBeInTheDocument();
  });

  it("fires onLocationSelect with the correct key when clicked", async () => {
    const onSelect = vi.fn();
    render(<LocationStep selectedLocation={null} onLocationSelect={onSelect} />);

    await userEvent.click(screen.getByText("At Your Place"));
    expect(onSelect).toHaveBeenCalledWith("your_place");

    await userEvent.click(screen.getByText("At Our Place"));
    expect(onSelect).toHaveBeenCalledWith("our_place");
  });
});
