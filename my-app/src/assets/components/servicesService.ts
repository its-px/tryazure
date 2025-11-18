import { supabase } from "./supabaseClient";

export interface Service {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
}

export const fetchServices = async (): Promise<Service[]> => {
  try {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching services:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Exception fetching services:", err);
    return [];
  }
};
