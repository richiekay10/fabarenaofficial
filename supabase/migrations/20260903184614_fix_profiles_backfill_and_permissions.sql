/*
# Fix missing profiles and get_admin_count permission

## Problems
1. Four existing auth.users have no profile rows because the `on_auth_user_created`
   trigger was created AFTER they signed up. These users can never log in because
   the app shows an infinite spinner when no profile is found.
2. `get_admin_count` has EXECUTE granted only to `authenticated`, but the frontend
   calls it during signup (before the user is authenticated) to check admin slot
   availability. The call fails silently for the `anon` role.

## Changes
1. Backfill: insert a profile row for every auth.users entry that doesn't have one.
   Default role is 'agent', full_name is derived from the email prefix.
2. Grant EXECUTE on `get_admin_count` to `anon` so it works during signup.

## Security
- Backfill inserts are safe — they only fill gaps for users who already exist.
- `get_admin_count` is a read-only count function; exposing it to anon is safe
  because it only returns a number, not user data.
*/

-- Backfill missing profiles for existing auth.users
INSERT INTO profiles (id, email, full_name, role, phone, zone)
SELECT 
  u.id, 
  u.email, 
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'agent',
  u.raw_user_meta_data->>'phone',
  u.raw_user_meta_data->>'zone'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id);

-- Allow anon to call get_admin_count (needed during signup before session exists)
GRANT EXECUTE ON FUNCTION get_admin_count TO anon;
