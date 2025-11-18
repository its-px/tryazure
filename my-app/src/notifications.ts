// notif.ts

// Fetch the names of services given their UUIDs
export async function fetchServiceNames(supabase: any, serviceIds: string[]) {
  if (!serviceIds || serviceIds.length === 0) return [];

  const { data, error } = await supabase
    .from("services")
    .select("id, name")
    .in("id", serviceIds);

  if (error) {
    console.error("Error fetching service names:", error);
    return serviceIds; // fallback to showing IDs if something fails
  }

  return data.map((s: any) => s.name);
}

// Wait for whichever Service Worker is active (VitePWA or Prod)
export async function getActiveServiceWorker() {
  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.ready;
    console.log("Using active Service Worker:", reg);
    return reg;
  }
  throw new Error("Service Worker not supported in this browser.");
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
export async function showBookingNotification(booking: any, supabase: any) {
  const permission = await requestNotificationPermission();
  if (permission !== "granted") return;

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

  // Fetch service names
  const serviceNames = await fetchServiceNames(supabase, serviceIds);
  const servicesText =
    serviceNames.length > 0 ? serviceNames.join(", ") : serviceIds.join(", "); // Fallback to IDs if names can't be fetched

  const reg = await getActiveServiceWorker();
  const title = "Booking Confirmed!";
  const options = {
    body: `Your booking for ${servicesText} on ${booking.date} is confirmed 🎉`,
    icon: "/logo.png",
    badge: "/logo.png",
    tag: `booking-${booking.id}`,
    data: {
      url: "/account",
      bookingId: booking.id,
    },
  };

  reg.showNotification(title, options);
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
export async function checkUpcomingAppointments(supabase: any, userId: string) {
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
