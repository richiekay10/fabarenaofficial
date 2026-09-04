import { useState } from 'react';
import { UserPlus, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { navigate } from '@/lib/router';
import type { CustomerStatus } from '@/lib/types';

interface FormData {
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

const emptyForm: FormData = {
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

export function AgentAddCustomerPage() {
  const { profile } = useAuth();
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setSuccess(null);

    if (!form.full_name.trim() || !form.phone.trim()) {
      setError('Full name and phone number are required.');
      return;
    }

    setSubmitting(true);

    // Look up the field_agents row linked to this agent's profile
    const { data: agentRow, error: agentError } = await supabase
      .from('field_agents')
      .select('id')
      .eq('profile_id', profile.id)
      .maybeSingle();

    if (agentError || !agentRow) {
      setError('Could not find your field agent profile. Please contact an administrator.');
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from('customers').insert({
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      national_id: form.national_id.trim() || null,
      occupation: form.occupation.trim() || null,
      monthly_income: form.monthly_income ? parseFloat(form.monthly_income) : null,
      status: form.status,
      notes: form.notes.trim() || null,
      field_agent_id: agentRow.id,
    });

    setSubmitting(false);

    if (insertError) {
      setError('Could not save the customer. Please try again.');
      return;
    }

    setSuccess(`${form.full_name} has been added and assigned to you.`);
    setForm(emptyForm);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="card p-6 bg-gradient-to-br from-accent-600 to-accent-800 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
            <UserPlus size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold">Add a New Customer</h2>
            <p className="text-accent-100 text-sm">This customer will be automatically assigned to you.</p>
          </div>
        </div>
      </div>

      {success && (
        <div className="rounded-lg bg-success-50 border border-success-200 px-4 py-3 text-sm text-success-700 flex items-start gap-2">
          <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{success}</p>
            <button onClick={() => navigate('/agent-accounts')} className="text-success-700 font-medium underline mt-1">
              View my accounts
            </button>
          </div>
          <button onClick={() => setSuccess(null)} className="text-success-600 hover:text-success-800">
            <span className="sr-only">Dismiss</span>
            <AlertCircle size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-error-50 border border-error-200 px-4 py-3 text-sm text-error-700 flex items-start gap-2">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="John Doe"
            />
            <Input
              label="Phone *"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+233 24 000 0000"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="john@example.com"
            />
            <Input
              label="National ID"
              value={form.national_id}
              onChange={(e) => setForm({ ...form, national_id: e.target.value })}
              placeholder="GHA-XXXXXXXXXXX"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Occupation"
              value={form.occupation}
              onChange={(e) => setForm({ ...form, occupation: e.target.value })}
              placeholder="Trader, Farmer, etc."
            />
            <Input
              label="Monthly Income (GHS)"
              type="number"
              step="0.01"
              min="0"
              value={form.monthly_income}
              onChange={(e) => setForm({ ...form, monthly_income: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <Textarea
            label="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Residential address"
          />

          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as CustomerStatus })}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blacklisted">Blacklisted</option>
          </Select>

          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Additional notes about this customer"
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setForm(emptyForm)}>
              Clear
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              {submitting ? 'Saving...' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
