/*
# Seed Auth Users with Properly Hashed Passwords

## Overview
Creates three test users directly in auth.users using Supabase's internal
password hashing (pgcrypto bcrypt). This migration also handles the case
where users were previously inserted with an incorrect password format
by deleting and re-inserting them.

## Users Created
- admin@japan365.com / Admin2026! — role: admin
- manager@japan365.com / Manager2026! — role: manager  
- staff@japan365.com / Staff2026! — role: staff

## Notes
- encrypted_password uses bcrypt via pgcrypto (gen_salt + crypt)
- email_confirmed_at is set immediately so users can log in without email verification
- raw_app_meta_data provider/providers must be set for Supabase auth to accept the row
- These users are for demo/testing only
*/

-- Remove any previously seeded users with old emails or broken passwords
DO $$
DECLARE
  uid uuid;
BEGIN
  FOR uid IN
    SELECT id FROM auth.users
    WHERE email IN (
      'admin@premier-erp.com','manager@premier-erp.com','staff@premier-erp.com',
      'admin@japan365.com','manager@japan365.com','staff@japan365.com'
    )
  LOOP
    DELETE FROM public.profiles WHERE id = uid;
    DELETE FROM auth.users WHERE id = uid;
  END LOOP;
END $$;

-- Insert admin user
DO $$
DECLARE
  new_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_id,
    'authenticated',
    'authenticated',
    'admin@japan365.com',
    crypt('Admin2026!', gen_salt('bf', 10)),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin User"}'::jsonb,
    now(), now(),
    '', '', '', ''
  );

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new_id, 'Admin User', 'admin');
END $$;

-- Insert manager user
DO $$
DECLARE
  new_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_id,
    'authenticated',
    'authenticated',
    'manager@japan365.com',
    crypt('Manager2026!', gen_salt('bf', 10)),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Sarah Johnson"}'::jsonb,
    now(), now(),
    '', '', '', ''
  );

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new_id, 'Sarah Johnson', 'manager');
END $$;

-- Insert staff user
DO $$
DECLARE
  new_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_id,
    'authenticated',
    'authenticated',
    'staff@japan365.com',
    crypt('Staff2026!', gen_salt('bf', 10)),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Mike Davis"}'::jsonb,
    now(), now(),
    '', '', '', ''
  );

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new_id, 'Mike Davis', 'staff');
END $$;
