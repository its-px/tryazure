import { supabase } from "./supabaseClient";

interface TimeSlot {
  start_time: string;
  end_time: string;
}

export const getAvailableSlots = async (
  professionalId: string,
  date: string,
  serviceDuration: number
): Promise<TimeSlot[]> => {
  try {
    // Add timeout to prevent infinite loading
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const { data, error } = await supabase.rpc("get_available_slots", {
      p_professional_id: professionalId,
      p_date: date,
      p_service_duration_minutes: serviceDuration,
    });

    clearTimeout(timeoutId);

    if (error) {
      console.error("Error fetching slots:", error);
      return [];
    }

    return (data as TimeSlot[]) || [];
  } catch (err) {
    console.error("Exception fetching slots:", err);
    return [];
  }
};
