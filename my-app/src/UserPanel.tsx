import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import BookService from "./BookService";

export default function UserPanel() {
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  useEffect(() => {
    const fetchDates = async () => {
      const { data } = await supabase.from("availability").select("date");
      const uniqueDates = [...new Set(data?.map((d) => d.date))];
      setAvailableDates(uniqueDates as string[]);
    };
    fetchDates();
  }, []);

  return (
    <div>
      <h2>User Panel</h2>
      <BookService availableDates={availableDates} />
    </div>
  );
}
