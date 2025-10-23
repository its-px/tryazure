/// <reference lib="webworker" />
export {}; // Make this a module, so TS uses the correct scope

declare let self: ServiceWorkerGlobalScope & typeof globalThis;
// import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
// import { registerRoute } from "workbox-routing";
// import { NetworkFirst, CacheFirst } from "workbox-strategies";
// declare const __WB_MANIFEST: any;

// cleanupOutdatedCaches();

// Injected by VitePWA at build time
//precacheAndRoute(self.__WB_MANIFEST);

// // Example: Cache API calls with NetworkFirst
// registerRoute(
//   ({ url }) => url.origin.includes("api."),
//   new NetworkFirst({
//     cacheName: "api-cache",
//     networkTimeoutSeconds: 10,
//   })
// );

// // Example: Cache images with CacheFirst
// registerRoute(
//   ({ request }) => request.destination === "image",
//   new CacheFirst({
//     cacheName: "image-cache",
//     matchOptions: { ignoreVary: true },
//   })
// );

// // Example: Listen for notifications and post messages to app
// self.addEventListener("notificationclick", (event) => {
//   event.notification.close();

//   const targetUrl = event.notification.data?.url || "/";
//   event.waitUntil(
//     self.clients
//       .matchAll({ type: "window", includeUncontrolled: true })
//       .then((clientList) => {
//         for (const client of clientList) {
//           if ("focus" in client) {
//             client.postMessage({ type: "SHOW_ACCOUNT_PAGE" }); // send to React listener
//             return client.focus();
//           }
//         }
//         if (self.clients.openWindow) {
//           return self.clients.openWindow(targetUrl);
//         }
//       })
//   );
// });
import { offlineFallback, warmStrategyCache } from "workbox-recipes";
import { CacheFirst, StaleWhileRevalidate } from "workbox-strategies";
import { registerRoute } from "workbox-routing";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";

// Set up page cache
const pageCache = new CacheFirst({
  cacheName: "page-cache",
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
  strategy: pageCache,
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

registerRoute(
  ({ request }) => request.destination === "image",
  new StaleWhileRevalidate({
    cacheName: "images",
  })
);

// Example: Listen for notifications and post messages to app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.postMessage({ type: "SHOW_ACCOUNT_PAGE" }); // send to React listener
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

registerRoute(({ request }) => request.mode === "navigate", pageCache);
