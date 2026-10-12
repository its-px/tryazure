import { supabase } from "./supabaseClient";

const urlBase64ToUint8Array = (b64: string) => {
  const raw = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

// Subscribe this device to web push and store it for the notify-waitlist function.
// Must be called from a user gesture (permission prompt). Silent no-op when unsupported,
// denied, or VITE_VAPID_PUBLIC_KEY isn't configured — email still works.
export const enablePush = async (tenantId: string, userId: string): Promise<void> => {
  const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapid || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    if ((await Notification.requestPermission()) !== "granted") return;
    const reg = await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      }));
    const j = sub.toJSON();
    await supabase.from("push_subscriptions").upsert(
      { user_id: userId, tenant_id: tenantId, endpoint: sub.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth },
      { onConflict: "endpoint" },
    );
  } catch (err) {
    console.error("[enablePush]", err);
  }
};
