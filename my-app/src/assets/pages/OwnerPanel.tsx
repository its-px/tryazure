import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

export default function OwnerPanel() {
  const [bookings, setBookings] = useState<{ date: string }[]>([]);

  useEffect(() => {
    const loadBookings = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("date");

      if (error) console.error("Error loading bookings:", error);
      else setBookings(data);
    };

    loadBookings();
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Owner Panel</h2>
      <p>All booked dates:</p>
      <ul>
        {bookings.map((b, i) => (
          <li key={i}>{b.date}</li>
        ))}
      </ul>
    </div>
  );
}
