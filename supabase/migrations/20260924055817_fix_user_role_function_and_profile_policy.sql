/*
# Fix user_role() function and profiles SELECT policy

## Problem
The user_role() SECURITY DEFINER function is callable by `anon`, but when called
during or just after login the session context may not be fully established, causing
"Database error querying schema". Additionally, the function needs a safe fallback
when called with no authenticated session.

## Changes

### 1. user_role() function
- Restrict EXECUTE to `authenticated` only (remove anon access)
- Add explicit NULL check so it returns 'staff' gracefully when auth.uid() is NULL
- Keep SECURITY DEFINER so it bypasses RLS when reading profiles

### 2. profiles SELECT policy
- Also allow anon to SELECT profiles (needed during the brief window between
  signInWithPassword resolving and onAuthStateChange firing, where the Supabase
  client fetches the profile using the new session token — if the token is treated
  as anon during that millisecond the query fails)
- Actually: keep authenticated-only on profiles SELECT, but ensure the function
  itself handles NULL uid gracefully so no schema error is thrown
*/

-- Drop existing function and recreate with NULL guard
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'staff'
  );
$$;

-- Revoke anon execute, keep only authenticated
REVOKE EXECUTE ON FUNCTION public.user_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.user_role() TO authenticated;
