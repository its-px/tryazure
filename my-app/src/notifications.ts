/* eslint-disable @typescript-eslint/no-explicit-any */
// notif.ts

import { supabase } from "./assets/components/supabaseClient";

// Use direct fetch for service names to avoid React callback issues
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fetch the names of services given their UUIDs using direct REST API
export async function fetchServiceNames(
  serviceIds: string[],
): Promise<string[]> {
  if (!serviceIds || serviceIds.length === 0) return [];

  try {
    console.log("🔔 Fetching service names for IDs:", serviceIds);

    // Build the query URL with in() filter
    const idsParam = serviceIds.map((id) => `"${id}"`).join(",");
    const url = `${SUPABASE_URL}/rest/v1/services?id=in.(${idsParam})&select=id,name`;

    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        "Error fetching service names:",
        response.status,
        response.statusText,
      );
      return serviceIds;
    }

    const data = await response.json();
    console.log("🔔 Query result:", data);

    if (data && Array.isArray(data) && data.length > 0) {
      const names = data.map((s: { name: string }) => s.name);
      console.log("🔔 Successfully fetched names:", names);
      return names;
    }

    console.warn("🔔 No data returned, falling back to IDs");
    return serviceIds;
  } catch (err) {
    console.error("Exception in fetchServiceNames:", err);
    return serviceIds; // fallback to IDs
  }
}

// Wait for whichever Service Worker is active (VitePWA or Prod) - with timeout
export async function getActiveServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Worker not supported in this browser.");
  }

  // Add 3 second timeout to prevent hanging
  const swPromise = navigator.serviceWorker.ready;
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Service Worker ready timeout")), 3000),
  );

  try {
    const reg = await Promise.race([swPromise, timeoutPromise]);
    console.log("Using active Service Worker:", reg);
    return reg;
  } catch (err) {
    console.error("Service Worker not ready:", err);
    throw err;
  }
}

// Ask user permission for notifications
export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    alert("This browser does not support notifications.");
    return "denied";
  }
  const permission = await Notification.requestPermission();
  return permission;
}

// Show booking confirmation
export async function showBookingNotification(booking: any) {
  console.log("🔔 showBookingNotification called with:", booking);

  const permission = await requestNotificationPermission();
  console.log("🔔 Notification permission:", permission);

  if (permission !== "granted") {
    console.warn("⚠️ Notification permission not granted:", permission);
    return;
  }

  // Parse booking.services - it could be a JSON string, array, or comma-separated string
  let serviceIds: string[] = [];
  if (typeof booking.services === "string") {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(booking.services);
      serviceIds = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // If not JSON, try splitting by comma
      serviceIds = booking.services
        .split(",")
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
    }
  } else if (Array.isArray(booking.services)) {
    serviceIds = booking.services;
  } else {
    serviceIds = [booking.services];
  }

  // Fetch service names (using imported supabase client)
  const serviceNames = await fetchServiceNames(serviceIds);
  const servicesText =
    serviceNames.length > 0 ? serviceNames.join(", ") : serviceIds.join(", "); // Fallback to IDs if names can't be fetched

  console.log("🔔 Fetched service names:", servicesText);

  const title = "Booking Pending Confirmation!";
  const notificationOptions = {
    body: `Your booking for ${servicesText} on ${booking.date} is pending confirmation `,
    icon: "/logo.png",
    badge: "/logo.png",
    tag: `booking-${booking.id}`,
    data: {
      url: "/account",
      bookingId: booking.id,
    },
  };

  try {
    // Try service worker notification first (works in background)
    const reg = await getActiveServiceWorker();
    console.log("🔔 Service worker ready, showing notification via SW...");
    await reg.showNotification(title, notificationOptions);
    console.log("✅ Notification displayed via Service Worker!");
  } catch (swError) {
    console.warn(
      "⚠️ Service Worker notification failed, trying direct Notification API:",
      swError,
    );

    // Fallback to direct Notification API (works when page is focused)
    try {
      const notification = new Notification(title, {
        body: notificationOptions.body,
        icon: notificationOptions.icon,
        tag: notificationOptions.tag,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      console.log("✅ Notification displayed via direct API!");
    } catch (directError) {
      console.error("❌ Both notification methods failed:", directError);
    }
  }
}

// Appointment reminder notification
export async function showAppointmentReminder(booking: any) {
  const permission = await requestNotificationPermission();
  if (permission !== "granted") return;

  const reg = await getActiveServiceWorker();
  const title = "Appointment Reminder";
  const options = {
    body: `Don't forget! You have an appointment tomorrow at ${booking.start_time}`,
    icon: "/logo.png",
    badge: "/logo.png",
    requireInteraction: true,
    tag: `reminder-${booking.id}`,
    data: {
      url: "/account",
      bookingId: booking.id,
    },
  };

  reg.showNotification(title, options);
}

// Schedule reminder (runs in frontend)
export function scheduleAppointmentReminder(booking: any) {
  const appointmentDate = new Date(`${booking.date}T${booking.start_time}`);
  const reminderTime = new Date(appointmentDate);
  reminderTime.setDate(reminderTime.getDate() - 1);
  reminderTime.setHours(18, 0, 0, 0);

  const now = new Date();
  const timeUntilReminder = reminderTime.getTime() - now.getTime();

  if (timeUntilReminder > 0) {
    console.log(`Scheduling reminder for ${reminderTime.toLocaleString()}`);
    setTimeout(() => showAppointmentReminder(booking), timeUntilReminder);
  }
}

// Check upcoming appointments in Supabase
export async function checkUpcomingAppointments(userId: string) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = tomorrow.toISOString().split("T")[0];

  const { data: appointments, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("user_id", userId)
    .eq("date", tomorrowDate)
    .eq("status", "pending");

  if (error) {
    console.error("Error checking appointments:", error);
    return;
  }

  if (appointments && appointments.length > 0) {
    console.log(`Found ${appointments.length} appointment(s) tomorrow`);
    for (const appointment of appointments) {
      await showAppointmentReminder(appointment);
    }
  }
}
