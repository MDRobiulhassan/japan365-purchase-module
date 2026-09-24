-- Restrict user_role() to authenticated only (was callable by anon)
REVOKE EXECUTE ON FUNCTION public.user_role() FROM anon;