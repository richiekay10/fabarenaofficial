/*
# Add field_agent_id to customers for customer-to-agent assignment

## Overview
Adds a nullable `field_agent_id` column to the `customers` table so that
administrators can assign a customer to a specific field agent. This is
a soft link — a customer can exist without an assigned agent (null), and
deleting a field agent sets the assignment back to null (SET NULL) rather
than deleting the customer.

## Changes
1. `customers` table: new column `field_agent_id` (uuid, nullable, FK → field_agents ON DELETE SET NULL).
2. Index on `customers.field_agent_id` for efficient lookup by agent.

## Security
- No policy changes needed — the existing `customers` CRUD policies already
  allow all authenticated users to SELECT/INSERT/UPDATE/DELETE. The new
  column is automatically covered by the existing `WITH CHECK (true)` and
  `USING (true)` policies since they apply to all columns.
*/

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS field_agent_id uuid REFERENCES field_agents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customers_field_agent ON customers(field_agent_id);
