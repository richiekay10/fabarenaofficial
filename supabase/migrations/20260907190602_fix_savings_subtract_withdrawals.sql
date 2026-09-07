/*
# Fix customer savings to subtract withdrawals

## Problem
The customer_savings view only added deposits and susu collections,
never subtracting withdrawals. So when a customer withdraws money,
their savings balance didn't change.

## Fix
Subtract withdrawal transactions from the total savings calculation.
*/

CREATE OR REPLACE VIEW customer_savings AS
SELECT
  c.id AS customer_id,
  COALESCE(sc.total_susu, 0) + COALESCE(tx.total_deposits, 0) - COALESCE(tx.total_withdrawals, 0) AS total_savings,
  COALESCE(sc.total_susu, 0) AS susu_savings,
  COALESCE(tx.total_deposits, 0) - COALESCE(tx.total_withdrawals, 0) AS deposit_savings,
  COALESCE(sc.collection_count, 0) + COALESCE(tx.deposit_count, 0) + COALESCE(tx.withdrawal_count, 0) AS transaction_count
FROM customers c
LEFT JOIN (
  SELECT customer_id, SUM(amount) AS total_susu, COUNT(*) AS collection_count
  FROM susu_collections
  GROUP BY customer_id
) sc ON sc.customer_id = c.id
LEFT JOIN (
  SELECT
    customer_id,
    SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) AS total_deposits,
    SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END) AS total_withdrawals,
    COUNT(CASE WHEN type = 'deposit' THEN 1 END) AS deposit_count,
    COUNT(CASE WHEN type = 'withdrawal' THEN 1 END) AS withdrawal_count
  FROM transactions
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id
) tx ON tx.customer_id = c.id;
