import { useCallback, useEffect, useMemo, useState } from 'react';
import { PiggyBank, Plus, Search, Trash2, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { SusuCollectionWithDetails, SusuAccountWithDetails } from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner, EmptyState, StatCard } from '@/components/ui/StatCard';
import { Input, Select, Textarea } from '@/components/ui/Input';

interface CollectionFormData {
  susu_account_id: string;
  amount: string;
  collection_date: string;
  method: 'cash' | 'mobile_money';
  notes: string;
}

const emptyForm: CollectionFormData = {
  susu_account_id: '',
  amount: '',
  collection_date: new Date().toISOString().slice(0, 10),
  method: 'cash',
  notes: '',
};

export function AgentCollectionsPage() {
  const { profile } = useAuth();
  const [collections, setCollections] = useState<SusuCollectionWithDetails[]>([]);
  const [accounts, setAccounts] = useState<SusuAccountWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<CollectionFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SusuCollectionWithDetails | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const [collRes, accRes] = await Promise.all([
      supabase.from('susu_collections')
        .select('*, susu_accounts(id, account_number), customers(id, full_name), field_agents(id, full_name)')
        .eq('field_agent_id', profile.id)
        .order('collection_date', { ascending: false }),
      supabase.from('susu_accounts')
        .select('*, customers(id, full_name, phone), field_agents(id, full_name, zone)')
        .eq('field_agent_id', profile.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
    ]);

    setCollections((collRes.data as SusuCollectionWithDetails[]) ?? []);
    setAccounts((accRes.data as SusuAccountWithDetails[]) ?? []);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return collections.filter((c) => {
      const matchesSearch = !search ||
        (c.customers?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.susu_accounts?.account_number ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesDate = !dateFilter || c.collection_date === dateFilter;
      return matchesSearch && matchesDate;
    });
  }, [collections, search, dateFilter]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTotal = collections.filter((c) => c.collection_date === todayStr).reduce((s, c) => s + Number(c.amount), 0);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekTotal = collections.filter((c) => new Date(c.collection_date) >= weekAgo).reduce((s, c) => s + Number(c.amount), 0);
  const allTimeTotal = collections.reduce((s, c) => s + Number(c.amount), 0);

  const openModal = () => {
    setFormData({ ...emptyForm, collection_date: todayStr });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!profile) return;
    const account = accounts.find((a) => a.id === formData.susu_account_id);
    if (!account) {
      setFormError('Please select a susu account.');
      return;
    }
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setFormError('Please enter a valid amount greater than zero.');
      return;
    }
    if (!formData.collection_date) {
      setFormError('Please select a collection date.');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('susu_collections').insert({
      susu_account_id: formData.susu_account_id,
      field_agent_id: profile.id,
      customer_id: account.customer_id,
      amount,
      collection_date: formData.collection_date,
      method: formData.method,
      notes: formData.notes || null,
    });
    setSubmitting(false);
    if (error) {
      setFormError('Could not save the collection. Please try again.');
      return;
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('susu_collections').delete().eq('id', deleteTarget.id);
    if (error) {
      setFormError('Could not delete the collection. Please try again.');
      setDeleteTarget(null);
      return;
    }
    setDeleteTarget(null);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Collected Today" value={formatCurrency(todayTotal)} icon={<TrendingUp size={24} />} color="green" />
        <StatCard label="This Week" value={formatCurrency(weekTotal)} icon={<PiggyBank size={24} />} color="blue" />
        <StatCard label="All-Time Total" value={formatCurrency(allTimeTotal)} icon={<PiggyBank size={24} />} color="amber" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search by customer or account..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <input
          type="date"
          className="input sm:w-40"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
        <Button onClick={openModal} variant="success" disabled={accounts.length === 0}>
          <Plus size={18} />
          Record Collection
        </Button>
      </div>

      {accounts.length === 0 && !loading && (
        <div className="rounded-lg bg-warning-50 border border-warning-200 px-4 py-3 text-sm text-warning-700">
          You have no active susu accounts assigned. Contact an administrator to get accounts assigned to you.
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<PiggyBank size={24} />}
            title="No collections found"
            description={search || dateFilter ? 'Try adjusting your filters.' : 'Record your first susu collection to get started.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header">Date</th>
                  <th className="table-header">Customer</th>
                  <th className="table-header">Account #</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Method</th>
                  <th className="table-header">Notes</th>
                  <th className="table-header">Recorded</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="table-cell text-slate-500">{formatDate(c.collection_date)}</td>
                    <td className="table-cell font-medium text-slate-800">{c.customers?.full_name ?? 'Unknown'}</td>
                    <td className="table-cell text-slate-600">{c.susu_accounts?.account_number ?? '—'}</td>
                    <td className="table-cell font-semibold text-accent-600">{formatCurrency(Number(c.amount))}</td>
                    <td className="table-cell"><Badge color="slate">{c.method.replace('_', ' ')}</Badge></td>
                    <td className="table-cell text-slate-500 max-w-xs truncate">{c.notes ?? '—'}</td>
                    <td className="table-cell text-slate-400 text-xs">{formatDateTime(c.created_at)}</td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end">
                        <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg text-slate-400 hover:bg-error-50 hover:text-error-600 transition" title="Delete">
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

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setFormError(null); }} title="Record Susu Collection" size="md">
        <div className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-error-50 border border-error-200 px-4 py-2.5 text-sm text-error-700">
              {formError}
            </div>
          )}
          <Select
            label="Susu Account *"
            value={formData.susu_account_id}
            onChange={(e) => setFormData({ ...formData, susu_account_id: e.target.value })}
          >
            <option value="">Select an account...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_number} — {a.customers?.full_name ?? 'Unknown'}
              </option>
            ))}
          </Select>

          {formData.susu_account_id && (() => {
            const acc = accounts.find((a) => a.id === formData.susu_account_id);
            if (!acc) return null;
            return (
              <div className="rounded-lg bg-accent-50 border border-accent-100 p-3 text-sm">
                <span className="text-slate-600">Daily target: </span>
                <span className="font-bold text-accent-700">{formatCurrency(Number(acc.daily_amount))}</span>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <Input
              label="Collection Date *"
              required
              type="date"
              value={formData.collection_date}
              onChange={(e) => setFormData({ ...formData, collection_date: e.target.value })}
            />
          </div>

          <Select
            label="Payment Method"
            value={formData.method}
            onChange={(e) => setFormData({ ...formData, method: e.target.value as 'cash' | 'mobile_money' })}
          >
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile Money</option>
          </Select>

          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Optional notes"
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !formData.susu_account_id || !formData.amount}>
              {submitting ? 'Saving...' : 'Record Collection'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Collection" size="sm">
        <p className="text-sm text-slate-600">
          Are you sure you want to delete this collection of <span className="font-semibold">{deleteTarget ? formatCurrency(Number(deleteTarget.amount)) : ''}</span>? This cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
