/*
# Add Transactions, Susu Accounts, Susu Collections, and Field Agents

## Overview
Adds four new tables to support:
1. A deposits & withdrawals (treasury/cash flow) section for the company.
2. A susu collection system where field agents record their daily collections
   and the admin/manager can see everything.

## New Tables

### 1. `transactions`
Tracks money deposited into or withdrawn from the company cash box / bank.
- `id` (uuid, primary key)
- `type` (text, not null) — 'deposit' | 'withdrawal'
- `amount` (numeric, not null, > 0)
- `category` (text, nullable) — e.g. 'capital', 'operational', 'salary', 'rent', 'other'
- `description` (text, nullable) — free-form description
- `method` (text, default 'cash') — cash | bank_transfer | mobile_money | cheque
- `reference` (text, nullable) — receipt / transaction reference
- `transaction_date` (date, not null) — date of the transaction
- `created_by` (uuid, nullable) — auth user who recorded it
- `created_at` (timestamptz, default now)

### 2. `field_agents`
Tracks the people who go around collecting susu contributions.
- `id` (uuid, primary key)
- `full_name` (text, not null)
- `phone` (text, not null)
- `email` (text, nullable)
- `zone` (text, nullable) — assigned area / zone
- `status` (text, default 'active') — active | inactive
- `created_at` (timestamptz, default now)
- `updated_at` (timestamptz, default now)

### 3. `susu_accounts`
Susu savings accounts linked to a customer and assigned to a field agent.
- `id` (uuid, primary key)
- `customer_id` (uuid, FK → customers, cascade delete)
- `field_agent_id` (uuid, FK → field_agents, cascade delete)
- `account_number` (text, unique) — auto-generated, e.g. 'SUSU-0001'
- `daily_amount` (numeric, not null, > 0) — daily contribution amount
- `status` (text, default 'active') — active | inactive
- `start_date` (date, not null)
- `notes` (text, nullable)
- `created_at` (timestamptz, default now)
- `updated_at` (timestamptz, default now)

### 4. `susu_collections`
Individual daily collection records made by field agents against susu accounts.
- `id` (uuid, primary key)
- `susu_account_id` (uuid, FK → susu_accounts, cascade delete)
- `field_agent_id` (uuid, FK → field_agents, cascade delete)
- `customer_id` (uuid, FK → customers, cascade delete) — denormalized for easy querying
- `amount` (numeric, not null, > 0)
- `collection_date` (date, not null)
- `method` (text, default 'cash') — cash | mobile_money
- `notes` (text, nullable)
- `created_at` (timestamptz, default now)

## Security
- RLS enabled on all new tables.
- All tables scoped to `TO authenticated` with shared access (all admin staff see all data),
  consistent with the existing schema pattern.
- `USING (true)` / `WITH CHECK (true)` is intentional — data is shared among all authenticated admins.

## Notes
1. A `susu_account_number_seq` sequence auto-generates account numbers via a trigger.
2. `updated_at` triggers added for `field_agents` and `susu_accounts`.
3. Indexes added on frequently-queried columns.
*/

-- ============================================================
-- TRANSACTIONS (deposits & withdrawals)
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  category text,
  description text,
  method text NOT NULL DEFAULT 'cash' CHECK (method IN ('cash', 'bank_transfer', 'mobile_money', 'cheque')),
  reference text,
  transaction_date date NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_transactions" ON transactions;
CREATE POLICY "select_transactions" ON transactions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_transactions" ON transactions;
CREATE POLICY "insert_transactions" ON transactions FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_transactions" ON transactions;
CREATE POLICY "update_transactions" ON transactions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_transactions" ON transactions;
CREATE POLICY "delete_transactions" ON transactions FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);

-- ============================================================
-- FIELD AGENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS field_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  zone text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE field_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_field_agents" ON field_agents;
CREATE POLICY "select_field_agents" ON field_agents FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_field_agents" ON field_agents;
CREATE POLICY "insert_field_agents" ON field_agents FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_field_agents" ON field_agents;
CREATE POLICY "update_field_agents" ON field_agents FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_field_agents" ON field_agents;
CREATE POLICY "delete_field_agents" ON field_agents FOR DELETE
  TO authenticated USING (true);

DROP TRIGGER IF EXISTS field_agents_updated_at ON field_agents;
CREATE TRIGGER field_agents_updated_at BEFORE UPDATE ON field_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_field_agents_status ON field_agents(status);

-- ============================================================
-- SUSU ACCOUNTS
-- ============================================================
CREATE TABLE IF NOT EXISTS susu_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  field_agent_id uuid NOT NULL REFERENCES field_agents(id) ON DELETE CASCADE,
  account_number text UNIQUE,
  daily_amount numeric(14, 2) NOT NULL CHECK (daily_amount > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  start_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE susu_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_susu_accounts" ON susu_accounts;
CREATE POLICY "select_susu_accounts" ON susu_accounts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_susu_accounts" ON susu_accounts;
CREATE POLICY "insert_susu_accounts" ON susu_accounts FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_susu_accounts" ON susu_accounts;
CREATE POLICY "update_susu_accounts" ON susu_accounts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_susu_accounts" ON susu_accounts;
CREATE POLICY "delete_susu_accounts" ON susu_accounts FOR DELETE
  TO authenticated USING (true);

DROP TRIGGER IF EXISTS susu_accounts_updated_at ON susu_accounts;
CREATE TRIGGER susu_accounts_updated_at BEFORE UPDATE ON susu_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_susu_accounts_customer ON susu_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_susu_accounts_agent ON susu_accounts(field_agent_id);
CREATE INDEX IF NOT EXISTS idx_susu_accounts_status ON susu_accounts(status);

-- ============================================================
-- SUSU COLLECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS susu_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  susu_account_id uuid NOT NULL REFERENCES susu_accounts(id) ON DELETE CASCADE,
  field_agent_id uuid NOT NULL REFERENCES field_agents(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  collection_date date NOT NULL,
  method text NOT NULL DEFAULT 'cash' CHECK (method IN ('cash', 'mobile_money')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE susu_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_susu_collections" ON susu_collections;
CREATE POLICY "select_susu_collections" ON susu_collections FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_susu_collections" ON susu_collections;
CREATE POLICY "insert_susu_collections" ON susu_collections FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_susu_collections" ON susu_collections;
CREATE POLICY "update_susu_collections" ON susu_collections FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_susu_collections" ON susu_collections;
CREATE POLICY "delete_susu_collections" ON susu_collections FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_susu_collections_account ON susu_collections(susu_account_id);
CREATE INDEX IF NOT EXISTS idx_susu_collections_agent ON susu_collections(field_agent_id);
CREATE INDEX IF NOT EXISTS idx_susu_collections_date ON susu_collections(collection_date);

-- ============================================================
-- SUSU ACCOUNT NUMBER SEQUENCE + AUTO-GENERATION
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS susu_account_number_seq START 0001;

CREATE OR REPLACE FUNCTION generate_susu_defaults()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.account_number IS NULL THEN
    NEW.account_number := 'SUSU-' || LPAD(nextval('susu_account_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS susu_generate_defaults ON susu_accounts;
CREATE TRIGGER susu_generate_defaults BEFORE INSERT ON susu_accounts
  FOR EACH ROW EXECUTE FUNCTION generate_susu_defaults();