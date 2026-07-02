import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { stubColors } from "../../test/setup";

const getAvailableSlots = vi.fn();
const joinWaitlist = vi.fn();

vi.mock("../../hooks/useResolvedColors", () => ({
  useResolvedColors: () => stubColors,
}));
vi.mock("./slotService", () => ({
  getAvailableSlots: (...args: unknown[]) => getAvailableSlots(...args),
}));
vi.mock("./waitlistService", () => ({
  joinWaitlist: (...args: unknown[]) => joinWaitlist(...args),
}));

import TimeSlotsStep from "./TimeSlotsStep";

const base = {
  professionalId: "p1",
  tenantId: "t1",
  serviceDuration: 30,
  selectedSlot: null,
  onSlotSelect: () => {},
};

beforeEach(() => {
  getAvailableSlots.mockReset();
  joinWaitlist.mockReset();
});

describe("TimeSlotsStep", () => {
  it("renders returned slots as HH:MM buttons", async () => {
    getAvailableSlots.mockResolvedValue([
      { start_time: "10:00:00", end_time: "10:30:00" },
      { start_time: "11:30:00", end_time: "12:00:00" },
    ]);
    render(<TimeSlotsStep {...base} selectedDate="2099-01-01" />);
    expect(await screen.findByText("10:00")).toBeInTheDocument();
    expect(screen.getByText("11:30")).toBeInTheDocument();
  });

  it("shows the empty message when no slots are available", async () => {
    getAvailableSlots.mockResolvedValue([]);
    render(<TimeSlotsStep {...base} selectedDate="2099-01-01" />);
    expect(await screen.findByText("No available slots for this date")).toBeInTheDocument();
  });

  it("fires onSlotSelect with the full slot object", async () => {
    const slot = { start_time: "10:00:00", end_time: "10:30:00" };
    getAvailableSlots.mockResolvedValue([slot]);
    const onSelect = vi.fn();
    render(<TimeSlotsStep {...base} selectedDate="2099-01-01" onSlotSelect={onSelect} />);
    await userEvent.click(await screen.findByText("10:00"));
    expect(onSelect).toHaveBeenCalledWith(slot);
  });

  it("filters out slots earlier than now when the date is today", async () => {
    // ponytail: 00:00:00 is "past" and 23:59:59 "future" vs the real clock;
    // only wrong in the first/last second of the day — fine for a unit test.
    const today = new Date().toISOString().split("T")[0];
    getAvailableSlots.mockResolvedValue([
      { start_time: "00:00:00", end_time: "00:30:00" }, // past
      { start_time: "23:59:59", end_time: "23:59:59" }, // future
    ]);
    render(<TimeSlotsStep {...base} selectedDate={today} />);

    expect(await screen.findByText("23:59")).toBeInTheDocument();
    expect(screen.queryByText("00:00")).not.toBeInTheDocument();
  });

  it("does not fetch when a required field is missing", async () => {
    render(<TimeSlotsStep {...base} professionalId={null} selectedDate="2099-01-01" />);
    expect(getAvailableSlots).not.toHaveBeenCalled();
  });

  it("shows Join Waitlist when empty and serviceId/userId are provided, and confirms after joining", async () => {
    getAvailableSlots.mockResolvedValue([]);
    joinWaitlist.mockResolvedValue(true);
    render(
      <TimeSlotsStep
        {...base}
        selectedDate="2099-01-01"
        serviceId="svc1"
        userId="user1"
      />,
    );
    const button = await screen.findByText("Join Waitlist");
    await userEvent.click(button);
    expect(joinWaitlist).toHaveBeenCalledWith("t1", "user1", "svc1", "p1", "2099-01-01");
    expect(await screen.findByText(/You're on the waitlist/)).toBeInTheDocument();
  });

  it("does not show Join Waitlist without serviceId/userId", async () => {
    getAvailableSlots.mockResolvedValue([]);
    render(<TimeSlotsStep {...base} selectedDate="2099-01-01" />);
    await screen.findByText("No available slots for this date");
    expect(screen.queryByText("Join Waitlist")).not.toBeInTheDocument();
  });
});
