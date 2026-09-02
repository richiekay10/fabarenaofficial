import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, Plus, Search, Trash2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Transaction, TransactionType, PaymentMethod } from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner, EmptyState, StatCard } from '@/components/ui/StatCard';
import { Input, Select, Textarea } from '@/components/ui/Input';

interface TxnFormData {
  type: TransactionType;
  amount: string;
  category: string;
  description: string;
  method: PaymentMethod;
  reference: string;
  transaction_date: string;
}

const emptyForm: TxnFormData = {
  type: 'deposit',
  amount: '',
  category: 'capital',
  description: '',
  method: 'cash',
  reference: '',
  transaction_date: new Date().toISOString().slice(0, 10),
};

const categoryLabels: Record<string, string> = {
  capital: 'Capital Injection',
  operational: 'Operational',
  salary: 'Salary',
  rent: 'Rent',
  loan_funding: 'Loan Funding',
  other: 'Other',
};

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<TxnFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false });
    setTransactions((data as Transaction[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        !search ||
        (t.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (t.reference ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (t.category ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || t.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [transactions, search, typeFilter]);

  const totalDeposits = transactions.filter((t) => t.type === 'deposit').reduce((s, t) => s + Number(t.amount), 0);
  const totalWithdrawals = transactions.filter((t) => t.type === 'withdrawal').reduce((s, t) => s + Number(t.amount), 0);
  const netCash = totalDeposits - totalWithdrawals;

  const openAdd = () => {
    setFormData({ ...emptyForm, transaction_date: new Date().toISOString().slice(0, 10) });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await supabase.from('transactions').insert({
      type: formData.type,
      amount: parseFloat(formData.amount),
      category: formData.category || null,
      description: formData.description || null,
      method: formData.method,
      reference: formData.reference || null,
      transaction_date: formData.transaction_date,
    });
    setSubmitting(false);
    setModalOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('transactions').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Deposits" value={formatCurrency(totalDeposits)} icon={<ArrowDownLeft size={24} />} color="green" />
        <StatCard label="Total Withdrawals" value={formatCurrency(totalWithdrawals)} icon={<ArrowUpRight size={24} />} color="red" />
        <StatCard label="Net Cash Position" value={formatCurrency(netCash)} icon={<ArrowLeftRight size={24} />} color="blue" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search by description, reference, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-40" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="deposit">Deposits</option>
          <option value="withdrawal">Withdrawals</option>
        </select>
        <Button onClick={openAdd} variant="primary">
          <Plus size={18} />
          New Transaction
        </Button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ArrowLeftRight size={24} />}
            title="No transactions found"
            description={search || typeFilter !== 'all' ? 'Try adjusting your filters.' : 'Record your first deposit or withdrawal to get started.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header">Date</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Description</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Method</th>
                  <th className="table-header">Reference</th>
                  <th className="table-header">Recorded</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="table-cell text-slate-500">{formatDate(t.transaction_date)}</td>
                    <td className="table-cell">
                      <Badge color={t.type === 'deposit' ? 'green' : 'red'}>
                        {t.type === 'deposit' ? <ArrowDownLeft size={12} className="inline mr-1" /> : <ArrowUpRight size={12} className="inline mr-1" />}
                        {t.type}
                      </Badge>
                    </td>
                    <td className="table-cell text-slate-600">{t.category ? categoryLabels[t.category] ?? t.category : '—'}</td>
                    <td className="table-cell text-slate-600 max-w-xs truncate">{t.description ?? '—'}</td>
                    <td className={`table-cell font-semibold ${t.type === 'deposit' ? 'text-accent-600' : 'text-error-600'}`}>
                      {t.type === 'deposit' ? '+' : '−'}{formatCurrency(Number(t.amount))}
                    </td>
                    <td className="table-cell">
                      <Badge color="slate">{t.method.replace('_', ' ')}</Badge>
                    </td>
                    <td className="table-cell text-slate-500">{t.reference ?? '—'}</td>
                    <td className="table-cell text-slate-400 text-xs">{formatDateTime(t.created_at)}</td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end">
                        <button onClick={() => setDeleteTarget(t)} className="p-1.5 rounded-lg text-slate-400 hover:bg-error-50 hover:text-error-600 transition" title="Delete">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Transaction" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setFormData({ ...formData, type: 'deposit' })}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${formData.type === 'deposit' ? 'border-accent-500 bg-accent-50 text-accent-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <ArrowDownLeft size={18} />
              <span className="font-medium text-sm">Deposit</span>
            </button>
            <button
              onClick={() => setFormData({ ...formData, type: 'withdrawal' })}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${formData.type === 'withdrawal' ? 'border-error-500 bg-error-50 text-error-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <ArrowUpRight size={18} />
              <span className="font-medium text-sm">Withdrawal</span>
            </button>
          </div>

          <Input
            label="Amount (GHS) *"
            required
            type="number"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0.00"
          />

          <Select
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            <option value="capital">Capital Injection</option>
            <option value="operational">Operational</option>
            <option value="salary">Salary</option>
            <option value="rent">Rent</option>
            <option value="loan_funding">Loan Funding</option>
            <option value="other">Other</option>
          </Select>

          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="What is this transaction for?"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Payment Method"
              value={formData.method}
              onChange={(e) => setFormData({ ...formData, method: e.target.value as PaymentMethod })}
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="cheque">Cheque</option>
            </Select>
            <Input
              label="Transaction Date *"
              required
              type="date"
              value={formData.transaction_date}
              onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
            />
          </div>

          <Input
            label="Reference / Receipt No."
            value={formData.reference}
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
            placeholder="Optional reference"
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !formData.amount}>
              {submitting ? 'Saving...' : 'Save Transaction'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Transaction" size="sm">
        <p className="text-sm text-slate-600">
          Are you sure you want to delete this {deleteTarget?.type} of <span className="font-semibold">{deleteTarget ? formatCurrency(Number(deleteTarget.amount)) : ''}</span>? This cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
