import { useState } from "react";
import { supabase } from "./supabaseClient";
import dayjs from "dayjs";

export default function AdminPanel() {
  const [startDate, setStartDate] = useState<string>(""); // Monday of the week
  const [loading, setLoading] = useState(false);

  const generateAvailability = async () => {
    if (!startDate) return alert("Pick a Monday!");
    setLoading(true);

    const dates = [];
    for (let i = 0; i < 5; i++) {
      const date = dayjs(startDate).add(i, "day").format("YYYY-MM-DD");
      dates.push(date);
    }

    const slots: any[] = [];
    for (const date of dates) {
      for (let hour = 8; hour < 20; hour++) {
        slots.push({ date, start_time: `${hour.toString().padStart(2,"0")}:00:00`, end_time: `${hour.toString().padStart(2,"0")}:30:00` });
        slots.push({ date, start_time: `${hour.toString().padStart(2,"0")}:30:00`, end_time: `${(hour+1).toString().padStart(2,"0")}:00:00` });
      }
    }

    const { error } = await supabase.from("availability").insert(slots);
    if (error) console.error(error);
    else alert("Availability generated!");

    setLoading(false);
  };

  return (
    <div>
      <h2>Admin Panel</h2>
      <label>
        Pick a Monday:
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </label>
      <button onClick={generateAvailability} disabled={loading}>
        {loading ? "Generating..." : "Generate Availability"}
      </button>
      <p>View bookings functionality can go here (future step).</p>
    </div>
  );
}
