-- Add daily steps and macros (protein, carbs, fat) to body_weight_logs
-- This table already tracks one entry per user per day, so it's the right place

ALTER TABLE public.body_weight_logs
  ADD COLUMN steps integer,
  ADD COLUMN protein decimal,
  ADD COLUMN carbs decimal,
  ADD COLUMN fat decimal;

-- Make weight optional so users can log just steps/macros without weight
ALTER TABLE public.body_weight_logs
  ALTER COLUMN weight DROP NOT NULL;
