-- Add weight unit preference to users table
ALTER TABLE public.users ADD COLUMN weight_unit text NOT NULL DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs'));
