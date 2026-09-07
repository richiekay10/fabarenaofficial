/*
# Reset all users and add customer numbers + per-customer transactions

## What this migration does

1. **Erases all existing users and dependent data** so the user can start fresh
   with a clean admin and field agent signup. This deletes:
   - All auth.users (and cascades to profiles via FK)
   - All field_agents (linked to profiles)
   - All customers, loans, repayments, susu_accounts, susu_collections, transactions
   - The admin-count check in handle_new_user is reset since no admins remain

2. **Adds customer_number column to customers table**
   - New `customer_number` column (text, unique)
   - Auto-generates a sequential number like "CUST-0001" on insert via a trigger
   - A sequence `customer_number_seq` backs the generation

3. **Adds customer_id to transactions table**
   - New `customer_id` column (uuid, nullable, FK to customers)
   - Allows transactions to be linked to specific customers
   - An index on customer_id for efficient per-customer queries

4. **Creates a per-customer savings view**
   - `customer_savings` view that sums all susu_collections + deposit transactions
     per customer, giving a real-time total savings amount

## Security
- No RLS policy changes needed — existing policies cover the new columns.
- The view is accessible to authenticated users.
*/

-- ============================================================
-- 1. ERASE ALL EXISTING DATA
-- ============================================================

-- Delete child records first (in dependency order)
DELETE FROM susu_collections;
DELETE FROM susu_accounts;
DELETE FROM repayments;
DELETE FROM loans;
DELETE FROM transactions;
DELETE FROM customers;
DELETE FROM field_agents;

-- Delete all auth users (cascades to profiles via FK)
DELETE FROM auth.users;

-- ============================================================
-- 2. ADD CUSTOMER_NUMBER TO CUSTOMERS TABLE
-- ============================================================

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS customer_number text UNIQUE;

-- Create a sequence for customer numbers
CREATE SEQUENCE IF NOT EXISTS customer_number_seq START 1;

-- Function to generate customer number
CREATE OR REPLACE FUNCTION generate_customer_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.customer_number IS NULL THEN
    NEW.customer_number := 'CUST-' || lpad(nextval('customer_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger (idempotent)
DROP TRIGGER IF EXISTS trg_generate_customer_number ON customers;
CREATE TRIGGER trg_generate_customer_number
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION generate_customer_number();

-- ============================================================
-- 3. ADD CUSTOMER_ID TO TRANSACTIONS TABLE
-- ============================================================

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);

-- ============================================================
-- 4. CREATE CUSTOMER_SAVINGS VIEW
-- ============================================================

-- Sum of susu collections per customer (the main savings mechanism)
CREATE OR REPLACE VIEW customer_savings AS
SELECT
  c.id AS customer_id,
  COALESCE(sc.total_susu, 0) + COALESCE(tx.total_deposits, 0) AS total_savings,
  COALESCE(sc.total_susu, 0) AS susu_savings,
  COALESCE(tx.total_deposits, 0) AS deposit_savings,
  COALESCE(sc.collection_count, 0) + COALESCE(tx.deposit_count, 0) AS transaction_count
FROM customers c
LEFT JOIN (
  SELECT customer_id, SUM(amount) AS total_susu, COUNT(*) AS collection_count
  FROM susu_collections
  GROUP BY customer_id
) sc ON sc.customer_id = c.id
LEFT JOIN (
  SELECT customer_id, SUM(amount) AS total_deposits, COUNT(*) AS deposit_count
  FROM transactions
  WHERE type = 'deposit' AND customer_id IS NOT NULL
  GROUP BY customer_id
) tx ON tx.customer_id = c.id;
