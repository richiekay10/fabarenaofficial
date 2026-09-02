import { type FormEvent } from 'react';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/format';
import type { PaymentMethod } from '@/lib/types';

export interface RepaymentFormData {
  loan_id: string;
  amount: string;
  payment_date: string;
  method: PaymentMethod;
  reference: string;
  notes: string;
}

export const emptyRepaymentForm: RepaymentFormData = {
  loan_id: '',
  amount: '',
  payment_date: new Date().toISOString().slice(0, 10),
  method: 'cash',
  reference: '',
  notes: '',
};

interface RepaymentFormProps {
  data: RepaymentFormData;
  onChange: (data: RepaymentFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
  outstanding?: number;
  loanIdLocked?: boolean;
}

export function RepaymentForm({ data, onChange, onSubmit, onCancel, submitting, outstanding, loanIdLocked }: RepaymentFormProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {outstanding !== undefined && outstanding > 0 && (
        <div className="rounded-lg bg-accent-50 border border-accent-100 p-3 text-sm">
          <span className="text-slate-600">Outstanding balance: </span>
          <span className="font-bold text-accent-700">{formatCurrency(outstanding)}</span>
        </div>
      )}

      <Input
        label="Amount *"
        required
        type="number"
        step="0.01"
        min="0"
        value={data.amount}
        onChange={(e) => onChange({ ...data, amount: e.target.value })}
        placeholder="0.00"
      />

      <Input
        label="Payment Date *"
        required
        type="date"
        value={data.payment_date}
        onChange={(e) => onChange({ ...data, payment_date: e.target.value })}
      />

      <Select
        label="Payment Method"
        value={data.method}
        onChange={(e) => onChange({ ...data, method: e.target.value as PaymentMethod })}
      >
        <option value="cash">Cash</option>
        <option value="bank_transfer">Bank Transfer</option>
        <option value="mobile_money">Mobile Money</option>
        <option value="cheque">Cheque</option>
      </Select>

      <Input
        label="Reference / Receipt No."
        value={data.reference}
        onChange={(e) => onChange({ ...data, reference: e.target.value })}
        placeholder="Optional transaction reference"
      />

      <Textarea
        label="Notes"
        value={data.notes}
        onChange={(e) => onChange({ ...data, notes: e.target.value })}
        placeholder="Optional notes"
      />

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="success" disabled={submitting}>
          {submitting ? 'Saving...' : 'Record Payment'}
        </Button>
      </div>
    </form>
  );
}
