// @ts-nocheck — service worker runs in WorkerGlobalScope, not DOM; these types are unavailable without webworker lib
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope &
  typeof globalThis & {
    registration: ServiceWorkerRegistration;
    clients: Clients;
  };

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// ── Background Sync: drain offline session queue ──────────────────────────
self.addEventListener("sync", (event: Event) => {
  const syncEvent = event as SyncEvent;
  if (syncEvent.tag === "repflow-session-sync") {
    syncEvent.waitUntil(
      fetch("/api/sync-offline-sessions", { method: "POST" }).catch(() => {
        // Silently fail — the online event listener in the app will retry
      })
    );
  }
});

// ── Push notifications ────────────────────────────────────────────────────
self.addEventListener("push", (event: Event) => {
  const pushEvent = event as PushEvent;
  const data = pushEvent.data?.json?.() ?? {
    title: "RepFlow",
    body: "You have a new notification.",
    url: "/",
    tag: "repflow",
  };

  pushEvent.waitUntil(
    self.registration.showNotification(data.title ?? "RepFlow", {
      body: data.body ?? "",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-96x96.png",
      tag: data.tag ?? "repflow",
      data: { url: data.url ?? "/" },
      requireInteraction: false,
    })
  );
});

// ── Notification click: focus or open the app ─────────────────────────────
self.addEventListener("notificationclick", (event: Event) => {
  const ne = event as NotificationEvent;
  ne.notification.close();
  const targetUrl = ne.notification.data?.url ?? "/";

  ne.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === targetUrl && "focus" in client) {
            return (client as WindowClient).focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
