-- Fix: prevent users from self-promoting to admin via direct UPDATE
-- Drop the existing permissive policy and replace with one that locks is_admin

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_admin = (SELECT is_admin FROM public.users WHERE id = auth.uid())
  );
