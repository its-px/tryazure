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
    console.log("[getAvailableSlots] Starting RPC call...");
    const rpcCall = supabase.rpc("get_available_slots", {
      p_professional_id: professionalId,
      p_date: date,
      p_service_duration_minutes: serviceDuration,
    });

    console.log("[getAvailableSlots] RPC call created, awaiting result...");
    const { data, error } = await rpcCall;
    console.log("[getAvailableSlots] RPC completed, data:", data?.length, "error:", error);

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
