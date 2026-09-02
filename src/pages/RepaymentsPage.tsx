import { useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCard, Plus, Search, TrendingUp, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Repayment, PaymentMethod } from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner, EmptyState, StatCard } from '@/components/ui/StatCard';
import { Select } from '@/components/ui/Input';
import { RepaymentForm, emptyRepaymentForm, type RepaymentFormData } from '@/components/forms/RepaymentForm';
import { navigate } from '@/lib/router';

interface RepaymentWithDetails extends Repayment {
  loans: {
    id: string;
    loan_number: string | null;
    customers: { full_name: string } | null;
  } | null;
}

export function RepaymentsPage() {
  const [repayments, setRepayments] = useState<RepaymentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<RepaymentFormData>(emptyRepaymentForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RepaymentWithDetails | null>(null);
  const [loanOptions, setLoanOptions] = useState<{ id: string; label: string }[]>([]);

  const loadRepayments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('repayments')
      .select('*, loans(id, loan_number, customers(full_name))')
      .order('payment_date', { ascending: false });
    setRepayments((data as RepaymentWithDetails[]) ?? []);
    setLoading(false);
  }, []);

  const loadLoanOptions = useCallback(async () => {
    const { data } = await supabase
      .from('loans')
      .select('id, loan_number, customers(full_name)')
      .in('status', ['active', 'overdue'])
      .order('created_at', { ascending: false });
    const options = (data ?? []).map((l: any) => ({
      id: l.id,
      label: `${l.loan_number} — ${l.customers?.full_name ?? 'Unknown'}`,
    }));
    setLoanOptions(options);
  }, []);

  useEffect(() => {
    loadRepayments();
  }, [loadRepayments]);

  useEffect(() => {
    if (modalOpen) loadLoanOptions();
  }, [modalOpen, loadLoanOptions]);

  const filtered = useMemo(() => {
    return repayments.filter((r) => {
      const matchesSearch =
        !search ||
        (r.loans?.customers?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (r.loans?.loan_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (r.reference ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesMethod = methodFilter === 'all' || r.method === methodFilter;
      return matchesSearch && matchesMethod;
    });
  }, [repayments, search, methodFilter]);

  const totalCollected = repayments.reduce((s, r) => s + Number(r.amount), 0);
  const thisMonth = repayments.filter((r) => {
    const d = new Date(r.payment_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthTotal = thisMonth.reduce((s, r) => s + Number(r.amount), 0);

  const openAdd = () => {
    setFormData({ ...emptyRepaymentForm, payment_date: new Date().toISOString().slice(0, 10) });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await supabase.from('repayments').insert({
      loan_id: formData.loan_id,
      amount: parseFloat(formData.amount),
      payment_date: formData.payment_date,
      method: formData.method,
      reference: formData.reference || null,
      notes: formData.notes || null,
    });
    setSubmitting(false);
    setModalOpen(false);
    loadRepayments();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('repayments').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    loadRepayments();
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Collected" value={formatCurrency(totalCollected)} icon={<TrendingUp size={24} />} color="green" />
        <StatCard label="This Month" value={formatCurrency(monthTotal)} icon={<CreditCard size={24} />} color="blue" />
        <StatCard label="Total Payments" value={repayments.length.toString()} icon={<CreditCard size={24} />} color="amber" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search by customer, loan, or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-44" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
          <option value="all">All Methods</option>
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="mobile_money">Mobile Money</option>
          <option value="cheque">Cheque</option>
        </select>
        <Button onClick={openAdd} variant="success">
          <Plus size={18} />
          Record Payment
        </Button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<CreditCard size={24} />}
            title="No repayments found"
            description={search || methodFilter !== 'all' ? 'Try adjusting your filters.' : 'Record your first repayment to get started.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header">Payment Date</th>
                  <th className="table-header">Customer</th>
                  <th className="table-header">Loan #</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Method</th>
                  <th className="table-header">Reference</th>
                  <th className="table-header">Recorded</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="table-cell text-slate-500">{formatDate(r.payment_date)}</td>
                    <td className="table-cell font-medium text-slate-800">
                      {r.loans?.customers?.full_name ?? 'Unknown'}
                    </td>
                    <td className="table-cell">
                      <button onClick={() => navigate(`/loans/${r.loans?.id}`)} className="text-primary-600 hover:text-primary-700 font-medium">
                        {r.loans?.loan_number ?? '—'}
                      </button>
                    </td>
                    <td className="table-cell font-semibold text-accent-600">{formatCurrency(Number(r.amount))}</td>
                    <td className="table-cell">
                      <Badge color="slate">{r.method.replace('_', ' ')}</Badge>
                    </td>
                    <td className="table-cell text-slate-500">{r.reference ?? '—'}</td>
                    <td className="table-cell text-slate-400 text-xs">{formatDateTime(r.created_at)}</td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end">
                        <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-lg text-slate-400 hover:bg-error-50 hover:text-error-600 transition" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Repayment" size="md">
        <div className="space-y-4">
          <Select
            label="Loan *"
            value={formData.loan_id}
            onChange={(e) => setFormData({ ...formData, loan_id: e.target.value })}
          >
            <option value="">Select a loan...</option>
            {loanOptions.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </Select>
          <RepaymentForm
            data={formData}
            onChange={setFormData}
            onSubmit={handleSubmit}
            onCancel={() => setModalOpen(false)}
            submitting={submitting}
            loanIdLocked
          />
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Repayment" size="sm">
        <p className="text-sm text-slate-600">
          Are you sure you want to delete this repayment of <span className="font-semibold">{deleteTarget ? formatCurrency(Number(deleteTarget.amount)) : ''}</span>? This cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
