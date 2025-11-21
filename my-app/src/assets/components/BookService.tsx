/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { supabase } from "../components/supabaseClient";
import { Dayjs } from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { Button, Select, MenuItem } from "@mui/material";
import { sendSMS } from "./sendSMS";

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
    console.log("🔄 Starting booking process...");

    if (!selectedSlot || !selectedDate) return alert("Pick a slot!");

    console.log("📅 Selected date:", selectedDate.format("YYYY-MM-DD"));
    console.log("⏰ Selected slot:", selectedSlot);

    const user = await supabase.auth.getUser();
    console.log("👤 User data:", user.data.user);
    console.log("📞 User phone from auth:", user.data.user?.phone);

    const { error } = await supabase.from("bookings").insert({
      user_id: user.data.user?.id,
      service_id:
        selectedService === 30 ? "<30min-service-id>" : "<1h-service-id>",
      date: selectedDate.format("YYYY-MM-DD"),
      start_time: selectedSlot.start_time,
      end_time: selectedSlot.end_time,
    });

    if (error) {
      console.error("❌ Booking error:", error);
      alert(error.message);
    } else {
      console.log("✅ Booking saved successfully!");
      alert("Booking successful!");

      // Get phone number from auth user
      const customerPhone = user.data.user?.phone || "";
      console.log("📱 Customer phone number:", customerPhone);

      const message = `Thank you for booking! Your appointment is on ${selectedDate.format(
        "YYYY-MM-DD"
      )} from ${selectedSlot.start_time} to ${selectedSlot.end_time}.`;
      console.log("💬 SMS message:", message);

      if (!customerPhone) {
        console.log("⚠️ No phone number found for user. SMS not sent.");
        alert(
          "Booking successful! (No phone number on file for SMS notification)"
        );
      } else {
        console.log("📤 Attempting to send SMS...");
        try {
          const smsResult = await sendSMS(customerPhone, message);
          console.log("✅ SMS sent successfully:", smsResult);
          console.log(
            `🎉 Booking completed for user: ${user.data.user?.id}. SMS sent to: ${customerPhone}`
          );
        } catch (smsError) {
          console.error("❌ Failed to send SMS:", smsError);
          console.log(
            `💥 Booking completed for user: ${user.data.user?.id}. SMS failed for: ${customerPhone}`
          );
        }
      }
    }
  };

  return (
    <div>
      <h3>Book a Service</h3>

      <DatePicker
        label="Select date"
        shouldDisableDate={(date) =>
          !availableDates.includes(date.format("YYYY-MM-DD"))
        }
        onChange={handleDateChange}
        value={selectedDate}
      />

      <div>
        <label>
          Service Duration:
          <Select
            value={selectedService}
            onChange={(e) => setSelectedService(Number(e.target.value))}
          >
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
