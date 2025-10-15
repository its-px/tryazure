export async function registerSW() {
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.register("/service-worker.js");
      console.log("Service Worker registered:", reg);
      return reg;
    } catch (err) {
      console.error("SW registration failed:", err);
    }
  }
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    alert("This browser does not support notifications.");
    return "denied";
  }
  const permission = await Notification.requestPermission();
  return permission;
}

export async function showBookingNotification(booking: any) {
  const permission = await requestNotificationPermission();
  if (permission !== "granted") return;

  const reg = await navigator.serviceWorker.ready;
  const title = "Booking Confirmed!";
  const options = {
    body: `Your booking for ${booking.services} on ${booking.date} is confirmed 🎉`,
    icon: "/icons/booking-icon-192.png",
    badge: "/icons/badge-72.png",
    tag: `booking-${booking.id}`,
    data: { bookingId: booking.id },
  };

  reg.showNotification(title, options);
}
