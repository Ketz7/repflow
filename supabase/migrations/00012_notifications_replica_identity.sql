-- ─────────────────────────────────────────────────────────────────────────────
-- 00012_notifications_replica_identity.sql
-- Fix: Supabase Realtime server-side column filters (e.g. user_id=eq.X)
-- require REPLICA IDENTITY FULL on non-primary-key columns. Without it the
-- WAL event doesn't carry enough metadata for the Realtime engine to match
-- subscriptions that filter on user_id, so notifications never reach the
-- subscribing coach/client in real time.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.notifications replica identity full;
