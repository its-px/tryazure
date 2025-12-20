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
    console.log("[getAvailableSlots] Starting RPC call via REST API...");
    
    // Get token from localStorage
    const storageKey = 'sb-auth-token';
    let token = null;
    try {
      const storedSession = localStorage.getItem(storageKey);
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        token = parsed?.access_token;
      }
    } catch (err) {
      console.error("[getAvailableSlots] Error reading token:", err);
    }
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const headers: Record<string, string> = {
      'apikey': supabaseKey,
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log("[getAvailableSlots] Making direct RPC request...");
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_available_slots`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        p_professional_id: professionalId,
        p_date: date,
        p_service_duration_minutes: serviceDuration,
      }),
    });
    
    console.log("[getAvailableSlots] Response status:", response.status);
    
    if (!response.ok) {
      console.error("[getAvailableSlots] Response not OK:", response.statusText);
      return [];
    }
    
    const data = await response.json();
    console.log("[getAvailableSlots] Slots loaded:", data?.length);
    return (data as TimeSlot[]) || [];
  } catch (err) {
    console.error("[getAvailableSlots] Exception:", err);
    return [];
  }
};
