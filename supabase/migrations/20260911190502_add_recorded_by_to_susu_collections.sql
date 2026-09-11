/*
# Add recorded_by column to susu_collections

1. Purpose
   Field agents sometimes cover for absent colleagues by collecting susu on their behalf.
   This migration adds a `recorded_by` column to `susu_collections` so we can track
   which field agent actually recorded the collection, separate from which agent
   the collection belongs to (`field_agent_id`).

2. Changes
   - Add `recorded_by` (uuid, nullable) to `susu_collections` — references `field_agents.id`.
   - No RLS policy changes needed; existing policies already allow authenticated users
     to insert/update susu_collections.

3. Notes
   - `recorded_by` is nullable so existing rows are unaffected.
   - When a field agent records a collection for themselves, `recorded_by` = `field_agent_id`.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'susu_collections' AND column_name = 'recorded_by'
  ) THEN
    ALTER TABLE susu_collections
      ADD COLUMN recorded_by uuid REFERENCES field_agents(id) ON DELETE SET NULL;
  END IF;
END $$;
