import { supabase } from "./supabaseClient";

export const getAvailableSlots = async (
  professionalId: string,
  date: string,
  serviceDuration: number
) => {
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_professional_id: professionalId,
    p_date: date,
    p_service_duration_minutes: serviceDuration,
  });

  if (error) {
    console.error("Error fetching slots:", error);
    return [];
  }

  return data || [];
};
