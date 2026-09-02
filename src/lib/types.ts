export type CustomerStatus = 'active' | 'inactive' | 'blacklisted';
export type LoanStatus = 'active' | 'repaid' | 'overdue' | 'defaulted';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'mobile_money' | 'cheque';
export type UserRole = 'admin' | 'agent';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  zone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  national_id: string | null;
  occupation: string | null;
  monthly_income: number | null;
  status: CustomerStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: string;
  customer_id: string;
  loan_number: string | null;
  principal_amount: number;
  interest_rate: number;
  term_months: number;
  disbursement_date: string;
  due_date: string | null;
  status: LoanStatus;
  purpose: string | null;
  created_at: string;
  updated_at: string;
}

export interface Repayment {
  id: string;
  loan_id: string;
  amount: number;
  payment_date: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface Settings {
  id: number;
  company_name: string;
  company_email: string | null;
  company_phone: string | null;
  company_address: string | null;
  default_interest_rate: number;
  currency: string;
  updated_at: string;
}

export interface LoanWithCustomer extends Loan {
  customers: Pick<Customer, 'id' | 'full_name' | 'phone'> | null;
}

export interface RepaymentWithLoan extends Repayment {
  loans: Pick<Loan, 'id' | 'loan_number' | 'principal_amount'> & {
    customers: Pick<Customer, 'id' | 'full_name'> | null;
  } | null;
}

export type TransactionType = 'deposit' | 'withdrawal';
export type TransactionCategory = 'capital' | 'operational' | 'salary' | 'rent' | 'loan_funding' | 'other';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string | null;
  description: string | null;
  method: PaymentMethod;
  reference: string | null;
  transaction_date: string;
  created_by: string | null;
  created_at: string;
}

export type AgentStatus = 'active' | 'inactive';

export interface FieldAgent {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  zone: string | null;
  status: AgentStatus;
  created_at: string;
  updated_at: string;
}

export type SusuAccountStatus = 'active' | 'inactive';

export interface SusuAccount {
  id: string;
  customer_id: string;
  field_agent_id: string;
  account_number: string | null;
  daily_amount: number;
  status: SusuAccountStatus;
  start_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SusuAccountWithDetails extends SusuAccount {
  customers: Pick<Customer, 'id' | 'full_name' | 'phone'> | null;
  field_agents: Pick<FieldAgent, 'id' | 'full_name' | 'zone'> | null;
}

export interface SusuCollection {
  id: string;
  susu_account_id: string;
  field_agent_id: string;
  customer_id: string;
  amount: number;
  collection_date: string;
  method: 'cash' | 'mobile_money';
  notes: string | null;
  created_at: string;
}

export interface SusuCollectionWithDetails extends SusuCollection {
  susu_accounts: Pick<SusuAccount, 'id' | 'account_number'> | null;
  customers: Pick<Customer, 'id' | 'full_name'> | null;
  field_agents: Pick<FieldAgent, 'id' | 'full_name'> | null;
}
