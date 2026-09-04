/*
# Link field_agents to auth profiles

## Problem
The `field_agents` table has no link to `auth.users` / `profiles`. Agent portal
pages use `profile.id` as `field_agent_id`, but `customers.field_agent_id`
references `field_agents(id)` — a different table with different UUIDs. This
means agent-created customers can't be properly linked.

## Changes
1. Add `profile_id` column to `field_agents` (nullable, unique, FK → profiles).
2. Backfill: match existing field_agents to profiles by email.
3. Update `handle_new_user` trigger: when a new agent signs up, auto-create a
   matching `field_agents` row so the agent's profile ID and field_agent ID
   are linked from the start.

## Security
- No RLS policy changes needed — `field_agents` already has full CRUD for
  authenticated users.
- The `handle_new_user` function is SECURITY DEFINER and already runs on
  signup; we extend it to also insert into `field_agents`.
*/

ALTER TABLE field_agents
  ADD COLUMN IF NOT EXISTS profile_id uuid UNIQUE REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_field_agents_profile ON field_agents(profile_id);

-- Backfill: link existing field_agents to profiles by matching email
UPDATE field_agents fa
SET profile_id = p.id
FROM profiles p
WHERE fa.email = p.email
  AND fa.profile_id IS NULL;

-- ============================================================
-- Update handle_new_user to also create a field_agents row for agents
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
  v_clean_phone text;
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

  -- For agents, also create a field_agents row linked to the profile
  IF v_requested_role = 'agent' THEN
    v_clean_phone := COALESCE(v_phone, '000-000-0000');
    INSERT INTO field_agents (full_name, phone, email, zone, status, profile_id)
    VALUES (v_full_name, v_clean_phone, NEW.email, v_zone, 'active', NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
