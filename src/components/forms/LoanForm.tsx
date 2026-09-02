import { type FormEvent, useEffect, useState } from 'react';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/format';
import { loanTotalPayable, loanMonthlyPayment } from '@/lib/format';
import type { Loan, LoanStatus } from '@/lib/types';

export interface LoanFormData {
  customer_id: string;
  principal_amount: string;
  interest_rate: string;
  term_months: string;
  disbursement_date: string;
  status: LoanStatus;
  purpose: string;
}

export const emptyLoanForm: LoanFormData = {
  customer_id: '',
  principal_amount: '',
  interest_rate: '12',
  term_months: '12',
  disbursement_date: new Date().toISOString().slice(0, 10),
  status: 'active',
  purpose: '',
};

export function loanToForm(l: Loan): LoanFormData {
  return {
    customer_id: l.customer_id,
    principal_amount: l.principal_amount.toString(),
    interest_rate: l.interest_rate.toString(),
    term_months: l.term_months.toString(),
    disbursement_date: l.disbursement_date,
    status: l.status,
    purpose: l.purpose ?? '',
  };
}

interface CustomerOption {
  id: string;
  full_name: string;
  phone: string;
}

interface LoanFormProps {
  data: LoanFormData;
  onChange: (data: LoanFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
  mode: 'add' | 'edit';
  presetCustomerId?: string;
}

export function LoanForm({ data, onChange, onSubmit, onCancel, submitting, mode, presetCustomerId }: LoanFormProps) {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);

  useEffect(() => {
    supabase
      .from('customers')
      .select('id, full_name, phone')
      .order('full_name')
      .then(({ data: rows }) => setCustomers((rows as CustomerOption[]) ?? []));
  }, []);

  const principal = parseFloat(data.principal_amount) || 0;
  const rate = parseFloat(data.interest_rate) || 0;
  const term = parseInt(data.term_months) || 0;
  const totalPayable = term > 0 ? loanTotalPayable(principal, rate, term) : 0;
  const monthly = term > 0 ? loanMonthlyPayment(principal, rate, term) : 0;
  const totalInterest = totalPayable - principal;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Customer *"
        required
        value={data.customer_id}
        onChange={(e) => onChange({ ...data, customer_id: e.target.value })}
        disabled={!!presetCustomerId && mode === 'edit'}
      >
        <option value="">Select a customer...</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.full_name} — {c.phone}
          </option>
        ))}
      </Select>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label="Principal Amount *"
          required
          type="number"
          step="0.01"
          min="0"
          value={data.principal_amount}
          onChange={(e) => onChange({ ...data, principal_amount: e.target.value })}
          placeholder="0.00"
        />
        <Input
          label="Interest Rate (%) *"
          required
          type="number"
          step="0.01"
          min="0"
          value={data.interest_rate}
          onChange={(e) => onChange({ ...data, interest_rate: e.target.value })}
          placeholder="12.00"
        />
        <Input
          label="Term (months) *"
          required
          type="number"
          min="1"
          value={data.term_months}
          onChange={(e) => onChange({ ...data, term_months: e.target.value })}
          placeholder="12"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Disbursement Date *"
          required
          type="date"
          value={data.disbursement_date}
          onChange={(e) => onChange({ ...data, disbursement_date: e.target.value })}
        />
        <Select
          label="Status"
          value={data.status}
          onChange={(e) => onChange({ ...data, status: e.target.value as LoanStatus })}
        >
          <option value="active">Active</option>
          <option value="repaid">Repaid</option>
          <option value="overdue">Overdue</option>
          <option value="defaulted">Defaulted</option>
        </Select>
      </div>

      <Textarea
        label="Purpose"
        value={data.purpose}
        onChange={(e) => onChange({ ...data, purpose: e.target.value })}
        placeholder="What is this loan for?"
      />

      {/* Summary preview */}
      {principal > 0 && term > 0 && (
        <div className="rounded-lg bg-primary-50 border border-primary-100 p-4 space-y-2">
          <h4 className="text-sm font-semibold text-primary-800">Loan Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-slate-600">Monthly Payment:</span>
            <span className="font-semibold text-slate-800 text-right">{formatCurrency(monthly)}</span>
            <span className="text-slate-600">Total Interest:</span>
            <span className="font-semibold text-slate-800 text-right">{formatCurrency(totalInterest)}</span>
            <span className="text-slate-600">Total Payable:</span>
            <span className="font-bold text-primary-700 text-right">{formatCurrency(totalPayable)}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={submitting || !data.customer_id}>
          {submitting ? 'Saving...' : mode === 'add' ? 'Create Loan' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
