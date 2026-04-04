/**
 * Supabase Edge Function: send-push
 *
 * Called by a Supabase Database Webhook on INSERT to public.notifications.
 * Looks up all push subscriptions for the notification's target user and
 * delivers the push via VAPID.
 *
 * Required secrets (set via `supabase secrets set`):
 *   VAPID_PUBLIC_KEY   — from scripts/generate-vapid-keys.mjs
 *   VAPID_PRIVATE_KEY  — from scripts/generate-vapid-keys.mjs
 *   VAPID_EMAIL        — e.g. mailto:support@repflow.app
 */

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Supabase Database Webhook sends { type, table, record, old_record }
    const body = await req.json();
    const record = body.record ?? body; // support both webhook and direct call shapes

    const userId: string = record.user_id;
    if (!userId) {
      return new Response("missing user_id", { status: 400, headers: corsHeaders });
    }

    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidEmail = Deno.env.get("VAPID_EMAIL") ?? "mailto:support@repflow.app";

    if (!vapidPublic || !vapidPrivate) {
      return new Response("VAPID keys not configured", { status: 500, headers: corsHeaders });
    }

    webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (!subs?.length) {
      return new Response("no subscriptions for user", { headers: corsHeaders });
    }

    const payload = JSON.stringify({
      title: record.title ?? "RepFlow",
      body: record.body ?? "",
      url: record.action_url ?? "/",
      tag: record.type ?? "notification",
    });

    const results = await Promise.allSettled(
      subs.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          );
        } catch (err: unknown) {
          // 410 Gone = subscription expired; remove it
          if (err && typeof err === "object" && "statusCode" in err && (err as { statusCode: number }).statusCode === 410) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
          }
          throw err;
        }
      }),
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return new Response(
      JSON.stringify({ sent, total: subs.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("send-push error:", err);
    return new Response(String(err), { status: 500, headers: corsHeaders });
  }
});
