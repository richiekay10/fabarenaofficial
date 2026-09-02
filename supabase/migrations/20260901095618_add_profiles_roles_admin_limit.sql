/*
# Add user profiles, roles, and admin limit enforcement

## Overview
Creates a `profiles` table linked to `auth.users` that stores each user's role
(admin or agent) and their display name. Adds a SECURITY DEFINER function
`handle_new_user` that runs on signup to create the profile row, enforcing:
1. Maximum 3 admin users.
2. New signups default to 'agent' role.
Also adds a function `get_signup_role` that the frontend calls to check whether
admin signup is still available (count < 3).

## New Tables

### `profiles`
- `id` (uuid, primary key, FK → auth.users, cascade delete)
- `email` (text, not null) — copied from auth.users
- `full_name` (text, not null) — display name
- `role` (text, not null, default 'agent') — 'admin' | 'agent'
- `phone` (text, nullable) — phone number (especially for agents)
- `zone` (text, nullable) — assigned area (especially for agents)
- `created_at` (timestamptz, default now)
- `updated_at` (timestamptz, default now)

## Security
- RLS enabled on `profiles`.
- Users can SELECT all profiles (admin needs to see agents, agents need to see admin info).
- Users can UPDATE only their own profile, but NOT the `role` column (column-level privilege revocation).
- The `role` column is set exclusively by the `handle_new_user` trigger function.
- `handle_new_user` is SECURITY DEFINER, runs as the owner, checks admin count before allowing admin role.
- `get_admin_count` is a SECURITY DEFINER function that returns the current number of admins.
- EXECUTE on both functions granted to `authenticated` only (not anon, since signup creates an authenticated session).

## Notes
1. The trigger fires AFTER INSERT on auth.users — Supabase calls this when a user signs up.
2. The frontend passes the desired role via `raw_user_meta_data` → the trigger reads it.
3. If admin count >= 3 and the requested role is 'admin', the trigger raises an exception.
4. Column-level UPDATE privilege: users can update `full_name`, `phone`, `zone` but NOT `role`.
*/

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
  phone text,
  zone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_profiles" ON profiles;
CREATE POLICY "select_profiles" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Column-level: revoke full UPDATE, grant only safe columns
REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (full_name, phone, zone) ON profiles TO authenticated;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- GET ADMIN COUNT (callable by frontend to check if admin slots available)
-- ============================================================
CREATE OR REPLACE FUNCTION get_admin_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT count(*)::integer FROM profiles WHERE role = 'admin';
$$;

REVOKE EXECUTE ON FUNCTION get_admin_count FROM anon;
GRANT EXECUTE ON FUNCTION get_admin_count TO authenticated;

-- ============================================================
-- HANDLE NEW USER — runs on signup, creates profile, enforces admin limit
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_requested_role text;
  v_admin_count integer;
  v_full_name text;
  v_phone text;
  v_zone text;
BEGIN
  v_requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'agent');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_phone := NEW.raw_user_meta_data->>'phone';
  v_zone := NEW.raw_user_meta_data->>'zone';

  IF v_requested_role = 'admin' THEN
    SELECT count(*)::integer INTO v_admin_count FROM profiles WHERE role = 'admin';
    IF v_admin_count >= 3 THEN
      RAISE EXCEPTION 'Maximum number of administrators (3) has been reached. Please sign up as a field agent instead.';
    END IF;
  END IF;

  INSERT INTO profiles (id, email, full_name, role, phone, zone)
  VALUES (NEW.id, NEW.email, v_full_name, v_requested_role, v_phone, v_zone);

  RETURN NEW;
END;
$$;

-- Drop old trigger if exists, recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);