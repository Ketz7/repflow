/**
 * Frontend helpers for Web Push subscription management.
 *
 * Requires NEXT_PUBLIC_VAPID_PUBLIC_KEY in your environment.
 * Generate the key pair with:  node scripts/generate-vapid-keys.mjs
 */

import { createClient } from "@/lib/supabase/client";

/** Convert a base64url VAPID public key to a Uint8Array for PushManager. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export type PushPermission = "granted" | "denied" | "default" | "unsupported";

export function getPushSupport(): { supported: boolean; reason?: string } {
  if (typeof window === "undefined") return { supported: false, reason: "ssr" };
  if (!("serviceWorker" in navigator)) return { supported: false, reason: "no-sw" };
  if (!("PushManager" in window)) return { supported: false, reason: "no-push" };
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return { supported: false, reason: "no-vapid-key" };
  return { supported: true };
}

export async function getCurrentPushPermission(): Promise<PushPermission> {
  if (!getPushSupport().supported) return "unsupported";
  return Notification.permission as PushPermission;
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  const { supported } = getPushSupport();
  if (!supported) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  });

  const json = subscription.toJSON();
  const supabase = createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint!,
      p256dh: json.keys!.p256dh,
      auth: json.keys!.auth,
    },
    { onConflict: "user_id,endpoint" },
  );

  return !error;
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    const supabase = createClient();
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", endpoint);
  }
}

export async function isSubscribed(): Promise<boolean> {
  if (!getPushSupport().supported) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub !== null;
}
