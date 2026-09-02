import { type FormEvent } from 'react';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Customer, CustomerStatus } from '@/lib/types';

export interface CustomerFormData {
  full_name: string;
  phone: string;
  email: string;
  address: string;
  national_id: string;
  occupation: string;
  monthly_income: string;
  status: CustomerStatus;
  notes: string;
}

export const emptyCustomerForm: CustomerFormData = {
  full_name: '',
  phone: '',
  email: '',
  address: '',
  national_id: '',
  occupation: '',
  monthly_income: '',
  status: 'active',
  notes: '',
};

export function customerToForm(c: Customer): CustomerFormData {
  return {
    full_name: c.full_name,
    phone: c.phone,
    email: c.email ?? '',
    address: c.address ?? '',
    national_id: c.national_id ?? '',
    occupation: c.occupation ?? '',
    monthly_income: c.monthly_income?.toString() ?? '',
    status: c.status,
    notes: c.notes ?? '',
  };
}

interface CustomerFormProps {
  data: CustomerFormData;
  onChange: (data: CustomerFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
  mode: 'add' | 'edit';
}

export function CustomerForm({ data, onChange, onSubmit, onCancel, submitting, mode }: CustomerFormProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Full Name *"
          required
          value={data.full_name}
          onChange={(e) => onChange({ ...data, full_name: e.target.value })}
          placeholder="John Doe"
        />
        <Input
          label="Phone *"
          required
          value={data.phone}
          onChange={(e) => onChange({ ...data, phone: e.target.value })}
          placeholder="+1234567890"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Email"
          type="email"
          value={data.email}
          onChange={(e) => onChange({ ...data, email: e.target.value })}
          placeholder="john@example.com"
        />
        <Input
          label="National ID"
          value={data.national_id}
          onChange={(e) => onChange({ ...data, national_id: e.target.value })}
          placeholder="ID / Passport number"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Occupation"
          value={data.occupation}
          onChange={(e) => onChange({ ...data, occupation: e.target.value })}
          placeholder="Trader, Farmer, etc."
        />
        <Input
          label="Monthly Income"
          type="number"
          step="0.01"
          value={data.monthly_income}
          onChange={(e) => onChange({ ...data, monthly_income: e.target.value })}
          placeholder="0.00"
        />
      </div>

      <Textarea
        label="Address"
        value={data.address}
        onChange={(e) => onChange({ ...data, address: e.target.value })}
        placeholder="Residential address"
      />

      <Select
        label="Status"
        value={data.status}
        onChange={(e) => onChange({ ...data, status: e.target.value as CustomerStatus })}
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="blacklisted">Blacklisted</option>
      </Select>

      <Textarea
        label="Notes"
        value={data.notes}
        onChange={(e) => onChange({ ...data, notes: e.target.value })}
        placeholder="Additional notes about this customer"
      />

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : mode === 'add' ? 'Add Customer' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
