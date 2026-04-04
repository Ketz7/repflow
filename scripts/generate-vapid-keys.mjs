/**
 * Generates a VAPID key pair for Web Push notifications.
 *
 * Run once:  node scripts/generate-vapid-keys.mjs
 *
 * Then:
 * 1. Add NEXT_PUBLIC_VAPID_PUBLIC_KEY=<publicKey>  to .env.local (and Vercel env vars)
 * 2. Run:
 *      supabase secrets set VAPID_PUBLIC_KEY=<publicKey>
 *      supabase secrets set VAPID_PRIVATE_KEY=<privateKey>
 *      supabase secrets set VAPID_EMAIL=mailto:your@email.com
 * 3. Deploy the Edge Function:
 *      supabase functions deploy send-push --no-verify-jwt
 * 4. In Supabase Dashboard → Database → Webhooks, create a webhook:
 *      Table: public.notifications
 *      Events: INSERT
 *      URL: https://<project-ref>.supabase.co/functions/v1/send-push
 *      HTTP method: POST
 */

import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("\n✅ VAPID keys generated\n");
console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + keys.publicKey);
console.log("VAPID_PRIVATE_KEY=" + keys.privateKey);
console.log("\n⚠️  Keep the private key secret — never commit it to git.\n");
