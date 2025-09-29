import { useState } from "react";
import { supabase } from "../components/supabaseClient";
import  { Dayjs } from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { Button, Select, MenuItem } from "@mui/material";

interface Props {
  availableDates: string[];
}

export default function BookService({ availableDates }: Props) {
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [selectedService, setSelectedService] = useState<number>(30); // duration in minutes

  const fetchSlots = async (date: string) => {
    const { data } = await supabase
      .from("availability")
      .select("*")
      .eq("date", date);

    // TODO: filter out slots already booked based on bookings table
    setAvailableSlots(data || []);
  };

  const handleDateChange = (date: Dayjs | null) => {
    setSelectedDate(date);
    if (date) fetchSlots(date.format("YYYY-MM-DD"));
  };

  const handleBook = async () => {
    if (!selectedSlot || !selectedDate) return alert("Pick a slot!");
    const user = await supabase.auth.getUser();
    const { error } = await supabase.from("bookings").insert({
      user_id: user.data.user?.id,
      service_id: selectedService === 30 ? "<30min-service-id>" : "<1h-service-id>",
      date: selectedDate.format("YYYY-MM-DD"),
      start_time: selectedSlot.start_time,
      end_time: selectedSlot.end_time,
    });
    if (error) alert(error.message);
    else alert("Booking successful!");
  };

  return (
    <div>
      <h3>Book a Service</h3>

      <DatePicker
        label="Select date"
        shouldDisableDate={(date) => !availableDates.includes(date.format("YYYY-MM-DD"))}
        onChange={handleDateChange}
        value={selectedDate}
      />

      <div>
        <label>
          Service Duration:
          <Select value={selectedService} onChange={(e) => setSelectedService(Number(e.target.value))}>
            <MenuItem value={30}>30 min</MenuItem>
            <MenuItem value={60}>1 hour</MenuItem>
          </Select>
        </label>
      </div>

      <div>
        <h4>Available Slots</h4>
        {availableSlots.map((slot) => (
          <Button
            key={`${slot.start_time}-${slot.end_time}`}
            onClick={() => setSelectedSlot(slot)}
            variant={selectedSlot === slot ? "contained" : "outlined"}
          >
            {slot.start_time} - {slot.end_time}
          </Button>
        ))}
      </div>

      <Button onClick={handleBook} disabled={!selectedSlot}>
        Book Now
      </Button>
    </div>
  );
}
