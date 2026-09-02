/*
# Fab Arena Ventures — Microfinance Management System Schema

## Overview
Creates the complete database schema for a microfinance company to track customers,
loans, repayments, and application settings. All data is shared among authenticated
admin users (staff), so policies are scoped to the `authenticated` role with shared access.

## New Tables

### 1. `customers`
Stores customer profiles for the microfinance company.
- `id` (uuid, primary key)
- `full_name` (text, not null) — customer's full name
- `phone` (text, not null) — primary phone number
- `email` (text, nullable) — optional email address
- `address` (text, nullable) — residential address
- `national_id` (text, nullable) — national ID / passport number
- `occupation` (text, nullable) — customer's occupation
- `monthly_income` (numeric, nullable) — reported monthly income
- `status` (text, default 'active') — active | inactive | blacklisted
- `notes` (text, nullable) — free-form notes about the customer
- `created_at` (timestamptz, default now)
- `updated_at` (timestamptz, default now)

### 2. `loans`
Stores loan records linked to customers.
- `id` (uuid, primary key)
- `customer_id` (uuid, foreign key → customers, cascade delete)
- `loan_number` (text, unique) — human-readable loan reference
- `principal_amount` (numeric, not null) — original loan amount
- `interest_rate` (numeric, not null) — annual interest rate as percentage (e.g. 12.5)
- `term_months` (integer, not null) — loan duration in months
- `disbursement_date` (date, not null) — date funds were released
- `due_date` (date, nullable) — calculated maturity date
- `status` (text, default 'active') — active | repaid | overdue | defaulted
- `purpose` (text, nullable) — purpose of the loan
- `created_at` (timestamptz, default now)
- `updated_at` (timestamptz, default now)

### 3. `repayments`
Stores individual repayment transactions against loans.
- `id` (uuid, primary key)
- `loan_id` (uuid, foreign key → loans, cascade delete)
- `amount` (numeric, not null) — amount paid
- `payment_date` (date, not null) — date of payment
- `method` (text, default 'cash') — cash | bank_transfer | mobile_money | cheque
- `reference` (text, nullable) — transaction reference / receipt number
- `notes` (text, nullable) — optional notes
- `created_at` (timestamptz, default now)

### 4. `settings`
Single-row table for company-wide configuration.
- `id` (integer, primary key, default 1) — enforced singleton
- `company_name` (text, default 'Fab Arena Ventures')
- `company_email` (text, nullable)
- `company_phone` (text, nullable)
- `company_address` (text, nullable)
- `default_interest_rate` (numeric, default 12.00)
- `currency` (text, default 'USD')
- `updated_at` (timestamptz, default now)

## Security
- RLS enabled on ALL tables.
- All tables scoped to `TO authenticated` with shared access (all admin staff see all data).
- This is a shared-data multi-user app: every authenticated user is an admin who can manage all records.
- `USING (true)` / `WITH CHECK (true)` is intentional here because the data is shared among all authenticated admins, not per-user isolated.

## Notes
1. An auto-incrementing sequence powers `loan_number` generation via a helper sequence.
2. `updated_at` is maintained by triggers on customers and loans.
3. The settings table is constrained to a single row.
*/

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text,
  national_id text,
  occupation text,
  monthly_income numeric(12, 2),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_customers" ON customers;
CREATE POLICY "select_customers" ON customers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_customers" ON customers;
CREATE POLICY "insert_customers" ON customers FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_customers" ON customers;
CREATE POLICY "update_customers" ON customers FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_customers" ON customers;
CREATE POLICY "delete_customers" ON customers FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- LOANS
-- ============================================================
CREATE TABLE IF NOT EXISTS loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  loan_number text UNIQUE,
  principal_amount numeric(14, 2) NOT NULL CHECK (principal_amount > 0),
  interest_rate numeric(6, 2) NOT NULL CHECK (interest_rate >= 0),
  term_months integer NOT NULL CHECK (term_months > 0),
  disbursement_date date NOT NULL,
  due_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'repaid', 'overdue', 'defaulted')),
  purpose text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_loans" ON loans;
CREATE POLICY "select_loans" ON loans FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_loans" ON loans;
CREATE POLICY "insert_loans" ON loans FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_loans" ON loans;
CREATE POLICY "update_loans" ON loans FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_loans" ON loans;
CREATE POLICY "delete_loans" ON loans FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- REPAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL,
  method text NOT NULL DEFAULT 'cash' CHECK (method IN ('cash', 'bank_transfer', 'mobile_money', 'cheque')),
  reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE repayments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_repayments" ON repayments;
CREATE POLICY "select_repayments" ON repayments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_repayments" ON repayments;
CREATE POLICY "insert_repayments" ON repayments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_repayments" ON repayments;
CREATE POLICY "update_repayments" ON repayments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_repayments" ON repayments;
CREATE POLICY "delete_repayments" ON repayments FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- SETTINGS (singleton)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name text NOT NULL DEFAULT 'Fab Arena Ventures',
  company_email text,
  company_phone text,
  company_address text,
  default_interest_rate numeric(6, 2) NOT NULL DEFAULT 12.00,
  currency text NOT NULL DEFAULT 'USD',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_settings" ON settings;
CREATE POLICY "select_settings" ON settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "update_settings" ON settings;
CREATE POLICY "update_settings" ON settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Seed the singleton settings row
INSERT INTO settings (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- LOAN NUMBER SEQUENCE + AUTO-GENERATION
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS loan_number_seq START 1001;

-- ============================================================
-- UPDATED_AT TRIGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customers_updated_at ON customers;
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS loans_updated_at ON loans;
CREATE TRIGGER loans_updated_at BEFORE UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS settings_updated_at ON settings;
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTO-GENERATE LOAN NUMBER + DUE DATE ON INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION generate_loan_defaults()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.loan_number IS NULL THEN
    NEW.loan_number := 'FAV-' || LPAD(nextval('loan_number_seq')::text, 6, '0');
  END IF;
  IF NEW.due_date IS NULL THEN
    NEW.due_date := (NEW.disbursement_date + (NEW.term_months || ' months')::interval)::date;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS loans_generate_defaults ON loans;
CREATE TRIGGER loans_generate_defaults BEFORE INSERT ON loans
  FOR EACH ROW EXECUTE FUNCTION generate_loan_defaults();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_loans_customer_id ON loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_repayments_loan_id ON repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_repayments_payment_date ON repayments(payment_date);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
