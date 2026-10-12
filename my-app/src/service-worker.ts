/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { offlineFallback, warmStrategyCache } from "workbox-recipes";
import { NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { registerRoute } from "workbox-routing";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Cleanup outdated caches from previous versions
cleanupOutdatedCaches();

// Precache and route assets injected by VitePWA at build time
precacheAndRoute(self.__WB_MANIFEST || []);

// Let new workers activate right away when an update is available.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Set up navigation cache strategy
const navigationCache = new NetworkFirst({
  cacheName: "page-cache",
  networkTimeoutSeconds: 3,
  plugins: [
    new CacheableResponsePlugin({
      statuses: [0, 200],
    }),
    new ExpirationPlugin({
      maxAgeSeconds: 30 * 24 * 60 * 60,
    }),
  ],
});

warmStrategyCache({
  urls: ["/index.html", "/"],
  strategy: navigationCache,
});

// Set up asset cache
registerRoute(
  ({ request }) => ["style", "script", "worker"].includes(request.destination),
  new StaleWhileRevalidate({
    cacheName: "asset-cache",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Set up offline fallback
offlineFallback({
  pageFallback: "/offline.html",
});

// Cache images
registerRoute(
  ({ request }) => request.destination === "image",
  new StaleWhileRevalidate({
    cacheName: "images",
  })
);

// Handle navigation requests
registerRoute(({ request }) => request.mode === "navigate", navigationCache);

// Web push (waitlist "your slot opened", etc). Always show a notification:
// a push that shows nothing makes Chrome show a generic one and may revoke permission.
self.addEventListener("push", (event) => {
  let d: { title?: string; body?: string; url?: string; tag?: string } = {};
  try {
    d = event.data?.json() ?? {};
  } catch {
    d = { body: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(d.title || "RENDEZVOUS", {
      body: d.body || "",
      icon: "/apple-touch-icon.png",
      tag: d.tag,
      data: { url: d.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Only same-origin targets; anything else falls back to the app root.
  let target: URL;
  try {
    target = new URL(event.notification.data?.url || "/", self.location.origin);
    if (target.origin !== self.location.origin) target = new URL("/", self.location.origin);
  } catch {
    target = new URL("/", self.location.origin);
  }
  // Booking deep links (waitlist offers) must land on the exact URL or the wizard prefill never runs.
  const isDeepLink = /[?&]services=/.test(target.search);

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const exact = clientList.find((c) => c.url === target.href);
        if (exact) return exact.focus();
        // New window, not navigate: re-navigating a mid-booking tab would lose its state.
        if (isDeepLink) return self.clients.openWindow(target.href);
        for (const client of clientList) {
          if ("focus" in client) {
            client.postMessage({ type: "SHOW_ACCOUNT_PAGE" });
            return client.focus();
          }
        }
        return self.clients.openWindow(target.href);
      }),
  );
});

// Take control immediately after activation.
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
  console.log("Service Worker activated - notifications are ready!");
});

export {};
