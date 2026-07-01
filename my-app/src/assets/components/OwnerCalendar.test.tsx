import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "dayjs";
import { stubColors } from "../../test/setup";

vi.mock("../../hooks/useResolvedColors", () => ({
  useResolvedColors: () => stubColors,
}));

import OwnerCalendar from "./OwnerCalendar";
import type { ProfessionalOption } from "./professionalsService";

const pros = [{ id: "1", code: "anna", name: "Anna" }] as ProfessionalOption[];
const serviceMap = { svc1: "Haircut" };
const today = dayjs().format("YYYY-MM-DD");
const future = dayjs().add(2, "day").format("YYYY-MM-DD");

const booking = {
  id: "b1",
  date: future,
  user_id: "u1",
  professional_id: "anna",
  location: "our_place",
  services: JSON.stringify(["svc1"]),
  status: "confirmed",
  created_at: today,
  start_time: "10:00:00",
  end_time: "10:30:00",
};

const base = {
  professionals: pros,
  serviceMap,
  onBookingClick: () => {},
  onNewBooking: () => {},
};

describe("OwnerCalendar", () => {
  it("shows the empty upcoming message when there are no bookings", () => {
    render(<OwnerCalendar {...base} bookings={[]} />);
    expect(screen.getByText("No upcoming bookings")).toBeInTheDocument();
  });

  it("lists an upcoming booking by resolved service name", () => {
    render(<OwnerCalendar {...base} bookings={[booking]} />);
    // Rendered in both the upcoming sidebar and the week grid.
    expect(screen.getAllByText("Haircut").length).toBeGreaterThan(0);
    expect(screen.queryByText("No upcoming bookings")).not.toBeInTheDocument();
  });

  it("calls onBookingClick when a booking is clicked", async () => {
    const onClick = vi.fn();
    render(<OwnerCalendar {...base} bookings={[booking]} onBookingClick={onClick} />);
    await userEvent.click(screen.getAllByText("Haircut")[0]);
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: "b1" }));
  });

  it("excludes cancelled bookings from the upcoming list", () => {
    render(
      <OwnerCalendar {...base} bookings={[{ ...booking, status: "cancelled" }]} />,
    );
    expect(screen.getByText("No upcoming bookings")).toBeInTheDocument();
  });

  it("calls onNewBooking with the focused date", async () => {
    const onNew = vi.fn();
    render(<OwnerCalendar {...base} bookings={[]} onNewBooking={onNew} />);
    await userEvent.click(screen.getByText("New Booking"));
    expect(onNew).toHaveBeenCalledWith(today);
  });
});
