import { useCallback, useEffect, useMemo, useState } from 'react';
import { Wallet, Plus, Search, Pencil, Trash2, Eye, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Loan, LoanStatus, Repayment } from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime, loanTotalPayable, loanMonthlyPayment } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner, EmptyState } from '@/components/ui/StatCard';
import { LoanForm, emptyLoanForm, loanToForm, type LoanFormData } from '@/components/forms/LoanForm';
import { RepaymentForm, emptyRepaymentForm, type RepaymentFormData } from '@/components/forms/RepaymentForm';
import { navigate } from '@/lib/router';

const statusColors: Record<LoanStatus, 'green' | 'blue' | 'red' | 'slate'> = {
  active: 'green',
  repaid: 'blue',
  overdue: 'red',
  defaulted: 'slate',
};

interface LoanWithCustomer extends Loan {
  customers: { full_name: string; phone: string } | null;
}

export function LoansPage() {
  const [loans, setLoans] = useState<LoanWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Loan | null>(null);
  const [formData, setFormData] = useState<LoanFormData>(emptyLoanForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LoanWithCustomer | null>(null);

  const loadLoans = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('loans')
      .select('*, customers(full_name, phone)')
      .order('created_at', { ascending: false });
    setLoans((data as LoanWithCustomer[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  const filtered = useMemo(() => {
    return loans.filter((l) => {
      const matchesSearch =
        !search ||
        (l.customers?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (l.loan_number ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [loans, search, statusFilter]);

  const openAdd = () => {
    setEditTarget(null);
    setFormData(emptyLoanForm);
    setModalOpen(true);
  };

  const openEdit = (l: Loan) => {
    setEditTarget(l);
    setFormData(loanToForm(l));
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload = {
      customer_id: formData.customer_id,
      principal_amount: parseFloat(formData.principal_amount),
      interest_rate: parseFloat(formData.interest_rate),
      term_months: parseInt(formData.term_months),
      disbursement_date: formData.disbursement_date,
      status: formData.status,
      purpose: formData.purpose || null,
    };

    if (editTarget) {
      await supabase.from('loans').update(payload).eq('id', editTarget.id);
    } else {
      await supabase.from('loans').insert(payload);
    }

    setSubmitting(false);
    setModalOpen(false);
    loadLoans();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('loans').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    loadLoans();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search by customer or loan number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="repaid">Repaid</option>
          <option value="overdue">Overdue</option>
          <option value="defaulted">Defaulted</option>
        </select>
        <Button onClick={openAdd}>
          <Plus size={18} />
          New Loan
        </Button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Wallet size={24} />}
            title="No loans found"
            description={search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Create your first loan to get started.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header">Loan #</th>
                  <th className="table-header">Customer</th>
                  <th className="table-header">Principal</th>
                  <th className="table-header">Rate</th>
                  <th className="table-header">Term</th>
                  <th className="table-header">Disbursed</th>
                  <th className="table-header">Created</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition">
                    <td className="table-cell font-medium text-primary-600">{l.loan_number}</td>
                    <td className="table-cell">
                      <button onClick={() => navigate(`/customers/${l.customer_id}`)} className="text-slate-800 hover:text-primary-600 font-medium">
                        {l.customers?.full_name ?? 'Unknown'}
                      </button>
                    </td>
                    <td className="table-cell font-semibold">{formatCurrency(Number(l.principal_amount))}</td>
                    <td className="table-cell">{Number(l.interest_rate).toFixed(2)}%</td>
                    <td className="table-cell">{l.term_months} mo</td>
                    <td className="table-cell text-slate-500">{formatDate(l.disbursement_date)}</td>
                    <td className="table-cell text-slate-400 text-xs">{formatDateTime(l.created_at)}</td>
                    <td className="table-cell">
                      <Badge color={statusColors[l.status]}>{l.status}</Badge>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/loans/${l.id}`)} className="p-1.5 rounded-lg text-slate-400 hover:bg-primary-50 hover:text-primary-600 transition" title="View">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => openEdit(l)} className="p-1.5 rounded-lg text-slate-400 hover:bg-warning-50 hover:text-warning-600 transition" title="Edit">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => setDeleteTarget(l)} className="p-1.5 rounded-lg text-slate-400 hover:bg-error-50 hover:text-error-600 transition" title="Delete">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Loan' : 'Create New Loan'} size="lg">
        <LoanForm
          data={formData}
          onChange={setFormData}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          submitting={submitting}
          mode={editTarget ? 'edit' : 'add'}
        />
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Loan" size="sm">
        <p className="text-sm text-slate-600">
          Are you sure you want to delete loan <span className="font-semibold">{deleteTarget?.loan_number}</span>? All repayments for this loan will also be deleted. This cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}

export function LoanDetailPage({ loanId }: { loanId: string }) {
  const [loan, setLoan] = useState<LoanWithCustomer | null>(null);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [formData, setFormData] = useState<LoanFormData>(emptyLoanForm);
  const [submitting, setSubmitting] = useState(false);
  const [repaymentOpen, setRepaymentOpen] = useState(false);
  const [repaymentForm, setRepaymentForm] = useState<RepaymentFormData>(emptyRepaymentForm);
  const [repaymentSubmitting, setRepaymentSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [lRes, rRes] = await Promise.all([
      supabase.from('loans').select('*, customers(full_name, phone)').eq('id', loanId).maybeSingle(),
      supabase.from('repayments').select('*').eq('loan_id', loanId).order('payment_date', { ascending: false }),
    ]);
    setLoan(lRes.data as LoanWithCustomer | null);
    setRepayments((rRes.data as Repayment[]) ?? []);
    setLoading(false);
  }, [loanId]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = () => {
    if (loan) {
      setFormData(loanToForm(loan));
      setEditOpen(true);
    }
  };

  const handleEdit = async () => {
    if (!loan) return;
    setSubmitting(true);
    const payload = {
      customer_id: formData.customer_id,
      principal_amount: parseFloat(formData.principal_amount),
      interest_rate: parseFloat(formData.interest_rate),
      term_months: parseInt(formData.term_months),
      disbursement_date: formData.disbursement_date,
      status: formData.status,
      purpose: formData.purpose || null,
    };
    await supabase.from('loans').update(payload).eq('id', loan.id);
    setSubmitting(false);
    setEditOpen(false);
    load();
  };

  const openRepayment = () => {
    setRepaymentForm({ ...emptyRepaymentForm, payment_date: new Date().toISOString().slice(0, 10) });
    setRepaymentOpen(true);
  };

  const handleRepayment = async () => {
    if (!loan) return;
    setRepaymentSubmitting(true);
    await supabase.from('repayments').insert({
      loan_id: loan.id,
      amount: parseFloat(repaymentForm.amount),
      payment_date: repaymentForm.payment_date,
      method: repaymentForm.method,
      reference: repaymentForm.reference || null,
      notes: repaymentForm.notes || null,
    });

    // Auto-update loan status if fully repaid
    const totalPayable = loanTotalPayable(Number(loan.principal_amount), Number(loan.interest_rate), loan.term_months);
    const totalPaid = repayments.reduce((s, r) => s + Number(r.amount), 0) + parseFloat(repaymentForm.amount);
    if (totalPaid >= totalPayable) {
      await supabase.from('loans').update({ status: 'repaid' }).eq('id', loan.id);
    }

    setRepaymentSubmitting(false);
    setRepaymentOpen(false);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} />
      </div>
    );
  }

  if (!loan) {
    return <EmptyState icon={<Wallet size={24} />} title="Loan not found" description="This loan may have been deleted." />;
  }

  const totalPayable = loanTotalPayable(Number(loan.principal_amount), Number(loan.interest_rate), loan.term_months);
  const monthlyPayment = loanMonthlyPayment(Number(loan.principal_amount), Number(loan.interest_rate), loan.term_months);
  const totalInterest = totalPayable - Number(loan.principal_amount);
  const totalPaid = repayments.reduce((s, r) => s + Number(r.amount), 0);
  const outstanding = Math.max(0, totalPayable - totalPaid);
  const progressPct = totalPayable > 0 ? Math.min(100, (totalPaid / totalPayable) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <button onClick={() => navigate('/dashboard')} className="hover:text-slate-600 transition">Dashboard</button>
        <span>/</span>
        <button onClick={() => navigate('/loans')} className="hover:text-slate-600 transition">Loans</button>
        <span>/</span>
        <span className="text-slate-600 font-medium">{loan.loan_number}</span>
      </div>

      {/* Loan header */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-800">{loan.loan_number}</h2>
              <Badge color={statusColors[loan.status]}>{loan.status}</Badge>
            </div>
            <button
              onClick={() => navigate(`/customers/${loan.customer_id}`)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium mt-1"
            >
              {loan.customers?.full_name ?? 'Unknown'} · {loan.customers?.phone}
            </button>
            {loan.purpose && <p className="text-sm text-slate-500 mt-2">{loan.purpose}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={openEdit}>
              <Pencil size={16} />
              Edit
            </Button>
            <Button onClick={openRepayment} disabled={loan.status === 'repaid'}>
              <Plus size={16} />
              Add Repayment
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Repayment Progress</span>
            <span className="text-sm font-bold text-slate-800">{progressPct.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-500 to-accent-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Financial details */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200">
          <DetailItem label="Principal" value={formatCurrency(Number(loan.principal_amount))} />
          <DetailItem label="Interest Rate" value={`${Number(loan.interest_rate).toFixed(2)}%`} />
          <DetailItem label="Term" value={`${loan.term_months} months`} />
          <DetailItem label="Monthly Payment" value={formatCurrency(monthlyPayment)} />
          <DetailItem label="Total Interest" value={formatCurrency(totalInterest)} />
          <DetailItem label="Total Payable" value={formatCurrency(totalPayable)} color="text-primary-700" />
          <DetailItem label="Total Paid" value={formatCurrency(totalPaid)} color="text-accent-600" />
          <DetailItem label="Outstanding" value={formatCurrency(outstanding)} color="text-error-600" />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Calendar size={16} />
            Disbursed: {formatDate(loan.disbursement_date)}
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Calendar size={16} />
            Due: {formatDate(loan.due_date)}
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Calendar size={16} />
            Created: {formatDateTime(loan.created_at)}
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Calendar size={16} />
            Last Updated: {formatDateTime(loan.updated_at)}
          </div>
        </div>
      </div>

      {/* Repayments table */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-slate-800 mb-4">Repayment History</h3>
        {repayments.length === 0 ? (
          <EmptyState icon={<TrendingUp size={24} />} title="No repayments yet" description="Click 'Add Repayment' to record a payment." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header">Payment Date</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Method</th>
                  <th className="table-header">Reference</th>
                  <th className="table-header">Recorded</th>
                  <th className="table-header">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {repayments.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="table-cell text-slate-500">{formatDate(r.payment_date)}</td>
                    <td className="table-cell font-semibold text-accent-600">{formatCurrency(Number(r.amount))}</td>
                    <td className="table-cell">
                      <Badge color="slate">{r.method.replace('_', ' ')}</Badge>
                    </td>
                    <td className="table-cell text-slate-500">{r.reference ?? '—'}</td>
                    <td className="table-cell text-slate-400 text-xs">{formatDateTime(r.created_at)}</td>
                    <td className="table-cell text-slate-500">{r.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Loan" size="lg">
        <LoanForm
          data={formData}
          onChange={setFormData}
          onSubmit={handleEdit}
          onCancel={() => setEditOpen(false)}
          submitting={submitting}
          mode="edit"
          presetCustomerId={loan.customer_id}
        />
      </Modal>

      <Modal open={repaymentOpen} onClose={() => setRepaymentOpen(false)} title="Add Repayment" size="md">
        <RepaymentForm
          data={repaymentForm}
          onChange={setRepaymentForm}
          onSubmit={handleRepayment}
          onCancel={() => setRepaymentOpen(false)}
          submitting={repaymentSubmitting}
          outstanding={outstanding}
        />
      </Modal>
    </div>
  );
}

function DetailItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${color ?? 'text-slate-800'}`}>{value}</p>
    </div>
  );
}
