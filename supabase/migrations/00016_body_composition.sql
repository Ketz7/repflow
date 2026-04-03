-- ─────────────────────────────────────────────────────────────────────────────
-- 00016_body_composition.sql
-- Extend daily body tracking to include body fat % and muscle mass %
-- Both columns are nullable — users only log what they measure
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.body_weight_logs
  add column fat_percentage  decimal check (fat_percentage  between 1 and 60),
  add column muscle_percentage decimal check (muscle_percentage between 1 and 80);
