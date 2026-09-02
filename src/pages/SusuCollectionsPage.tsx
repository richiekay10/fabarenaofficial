import { useCallback, useEffect, useMemo, useState } from 'react';
import { PiggyBank, Plus, Search, Trash2, Calendar, TrendingUp, ClipboardList } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { SusuCollectionWithDetails, SusuAccountWithDetails, FieldAgent, Customer, PaymentMethod } from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner, EmptyState, StatCard } from '@/components/ui/StatCard';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { navigate } from '@/lib/router';

interface CollectionFormData {
  susu_account_id: string;
  amount: string;
  collection_date: string;
  method: 'cash' | 'mobile_money';
  notes: string;
}

const emptyCollectionForm: CollectionFormData = {
  susu_account_id: '',
  amount: '',
  collection_date: new Date().toISOString().slice(0, 10),
  method: 'cash',
  notes: '',
};

interface AccountFormData {
  customer_id: string;
  field_agent_id: string;
  daily_amount: string;
  start_date: string;
  notes: string;
}

const emptyAccountForm: AccountFormData = {
  customer_id: '',
  field_agent_id: '',
  daily_amount: '',
  start_date: new Date().toISOString().slice(0, 10),
  notes: '',
};

export function SusuCollectionsPage() {
  const [collections, setCollections] = useState<SusuCollectionWithDetails[]>([]);
  const [accounts, setAccounts] = useState<SusuAccountWithDetails[]>([]);
  const [agents, setAgents] = useState<FieldAgent[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [tab, setTab] = useState<'collections' | 'accounts'>('collections');

  const [collectionModal, setCollectionModal] = useState(false);
  const [accountModal, setAccountModal] = useState(false);
  const [collectionForm, setCollectionForm] = useState<CollectionFormData>(emptyCollectionForm);
  const [accountForm, setAccountForm] = useState<AccountFormData>(emptyAccountForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SusuCollectionWithDetails | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [collRes, accRes, agentRes, custRes] = await Promise.all([
      supabase.from('susu_collections')
        .select('*, susu_accounts(id, account_number), customers(id, full_name), field_agents(id, full_name)')
        .order('collection_date', { ascending: false }),
      supabase.from('susu_accounts')
        .select('*, customers(id, full_name, phone), field_agents(id, full_name, zone)')
        .order('created_at', { ascending: false }),
      supabase.from('field_agents').select('*').eq('status', 'active').order('full_name'),
      supabase.from('customers').select('*').order('full_name'),
    ]);

    setCollections((collRes.data as SusuCollectionWithDetails[]) ?? []);
    setAccounts((accRes.data as SusuAccountWithDetails[]) ?? []);
    setAgents((agentRes.data as FieldAgent[]) ?? []);
    setCustomers((custRes.data as Customer[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredCollections = useMemo(() => {
    return collections.filter((c) => {
      const matchesSearch = !search ||
        (c.customers?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.susu_accounts?.account_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.field_agents?.full_name ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesAgent = agentFilter === 'all' || c.field_agent_id === agentFilter;
      const matchesDate = !dateFilter || c.collection_date === dateFilter;
      return matchesSearch && matchesAgent && matchesDate;
    });
  }, [collections, search, agentFilter, dateFilter]);

  const totalCollected = collections.reduce((s, c) => s + Number(c.amount), 0);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCollections = collections.filter((c) => c.collection_date === todayStr);
  const todayTotal = todayCollections.reduce((s, c) => s + Number(c.amount), 0);
  const activeAccounts = accounts.filter((a) => a.status === 'active').length;

  const openCollectionModal = () => {
    setCollectionForm({ ...emptyCollectionForm, collection_date: todayStr });
    setCollectionModal(true);
  };

  const openAccountModal = () => {
    setAccountForm({ ...emptyAccountForm, start_date: todayStr });
    setAccountModal(true);
  };

  const handleCollectionSubmit = async () => {
    setSubmitting(true);
    const account = accounts.find((a) => a.id === collectionForm.susu_account_id);
    if (account) {
      await supabase.from('susu_collections').insert({
        susu_account_id: collectionForm.susu_account_id,
        field_agent_id: account.field_agent_id,
        customer_id: account.customer_id,
        amount: parseFloat(collectionForm.amount),
        collection_date: collectionForm.collection_date,
        method: collectionForm.method,
        notes: collectionForm.notes || null,
      });
    }
    setSubmitting(false);
    setCollectionModal(false);
    load();
  };

  const handleAccountSubmit = async () => {
    setSubmitting(true);
    await supabase.from('susu_accounts').insert({
      customer_id: accountForm.customer_id,
      field_agent_id: accountForm.field_agent_id,
      daily_amount: parseFloat(accountForm.daily_amount),
      start_date: accountForm.start_date,
      notes: accountForm.notes || null,
    });
    setSubmitting(false);
    setAccountModal(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('susu_collections').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Susu Collected" value={formatCurrency(totalCollected)} icon={<PiggyBank size={24} />} color="green" />
        <StatCard label="Collected Today" value={formatCurrency(todayTotal)} icon={<TrendingUp size={24} />} color="blue" />
        <StatCard label="Active Susu Accounts" value={activeAccounts.toString()} icon={<ClipboardList size={24} />} color="amber" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab('collections')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab === 'collections' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Daily Collections
        </button>
        <button
          onClick={() => setTab('accounts')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab === 'accounts' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Susu Accounts
        </button>
      </div>

      {tab === 'collections' ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-10"
                placeholder="Search by customer, account, or agent..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="input sm:w-44" value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
              <option value="all">All Agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.full_name}</option>
              ))}
            </select>
            <input
              type="date"
              className="input sm:w-40"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            <Button onClick={openCollectionModal} variant="success">
              <Plus size={18} />
              Record Collection
            </Button>
          </div>

          <div className="card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Spinner size={32} />
              </div>
            ) : filteredCollections.length === 0 ? (
              <EmptyState
                icon={<PiggyBank size={24} />}
                title="No collections found"
                description={search || agentFilter !== 'all' || dateFilter ? 'Try adjusting your filters.' : 'Record your first susu collection to get started.'}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="table-header">Date</th>
                      <th className="table-header">Customer</th>
                      <th className="table-header">Account #</th>
                      <th className="table-header">Field Agent</th>
                      <th className="table-header">Amount</th>
                      <th className="table-header">Method</th>
                      <th className="table-header">Notes</th>
                      <th className="table-header text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCollections.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition">
                        <td className="table-cell text-slate-500">{formatDate(c.collection_date)}</td>
                        <td className="table-cell font-medium text-slate-800">
                          <button onClick={() => navigate(`/customers/${c.customer_id}`)} className="text-primary-600 hover:text-primary-700">
                            {c.customers?.full_name ?? 'Unknown'}
                          </button>
                        </td>
                        <td className="table-cell text-slate-600">{c.susu_accounts?.account_number ?? '—'}</td>
                        <td className="table-cell text-slate-600">{c.field_agents?.full_name ?? '—'}</td>
                        <td className="table-cell font-semibold text-accent-600">{formatCurrency(Number(c.amount))}</td>
                        <td className="table-cell">
                          <Badge color="slate">{c.method.replace('_', ' ')}</Badge>
                        </td>
                        <td className="table-cell text-slate-500 max-w-xs truncate">{c.notes ?? '—'}</td>
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
        </>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-10"
                placeholder="Search by customer or account number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={openAccountModal} variant="primary">
              <Plus size={18} />
              New Susu Account
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner size={32} />
            </div>
          ) : accounts.filter((a) => {
            return !search ||
              (a.customers?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
              (a.account_number ?? '').toLowerCase().includes(search.toLowerCase());
          }).length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<PiggyBank size={24} />}
                title="No susu accounts found"
                description={search ? 'Try adjusting your search.' : 'Create your first susu account to get started.'}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.filter((a) => {
                return !search ||
                  (a.customers?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
                  (a.account_number ?? '').toLowerCase().includes(search.toLowerCase());
              }).map((account) => {
                const collected = collections
                  .filter((c) => c.susu_account_id === account.id)
                  .reduce((s, c) => s + Number(c.amount), 0);
                return (
                  <div key={account.id} className="card p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs font-medium text-slate-400">{account.account_number}</p>
                        <h3 className="text-sm font-semibold text-slate-800 mt-0.5">
                          <button onClick={() => navigate(`/customers/${account.customer_id}`)} className="text-primary-600 hover:text-primary-700">
                            {account.customers?.full_name ?? 'Unknown'}
                          </button>
                        </h3>
                      </div>
                      <Badge color={account.status === 'active' ? 'green' : 'slate'}>{account.status}</Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Daily Target</span>
                        <span className="font-semibold text-slate-800">{formatCurrency(Number(account.daily_amount))}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Total Collected</span>
                        <span className="font-semibold text-accent-600">{formatCurrency(collected)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Field Agent</span>
                        <span className="text-slate-700">{account.field_agents?.full_name ?? '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Started</span>
                        <span className="text-slate-600 flex items-center gap-1"><Calendar size={12} /> {formatDate(account.start_date)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Collection modal */}
      <Modal open={collectionModal} onClose={() => setCollectionModal(false)} title="Record Susu Collection" size="md">
        <div className="space-y-4">
          <Select
            label="Susu Account *"
            value={collectionForm.susu_account_id}
            onChange={(e) => setCollectionForm({ ...collectionForm, susu_account_id: e.target.value })}
          >
            <option value="">Select an account...</option>
            {accounts.filter((a) => a.status === 'active').map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_number} — {a.customers?.full_name ?? 'Unknown'} ({a.field_agents?.full_name ?? 'No agent'})
              </option>
            ))}
          </Select>

          {collectionForm.susu_account_id && (() => {
            const acc = accounts.find((a) => a.id === collectionForm.susu_account_id);
            if (!acc) return null;
            return (
              <div className="rounded-lg bg-accent-50 border border-accent-100 p-3 text-sm">
                <span className="text-slate-600">Daily target: </span>
                <span className="font-bold text-accent-700">{formatCurrency(Number(acc.daily_amount))}</span>
                <span className="text-slate-400 ml-2">· Agent: {acc.field_agents?.full_name ?? '—'}</span>
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
              value={collectionForm.amount}
              onChange={(e) => setCollectionForm({ ...collectionForm, amount: e.target.value })}
              placeholder="0.00"
            />
            <Input
              label="Collection Date *"
              required
              type="date"
              value={collectionForm.collection_date}
              onChange={(e) => setCollectionForm({ ...collectionForm, collection_date: e.target.value })}
            />
          </div>

          <Select
            label="Payment Method"
            value={collectionForm.method}
            onChange={(e) => setCollectionForm({ ...collectionForm, method: e.target.value as 'cash' | 'mobile_money' })}
          >
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile Money</option>
          </Select>

          <Textarea
            label="Notes"
            value={collectionForm.notes}
            onChange={(e) => setCollectionForm({ ...collectionForm, notes: e.target.value })}
            placeholder="Optional notes"
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCollectionModal(false)}>Cancel</Button>
            <Button onClick={handleCollectionSubmit} disabled={submitting || !collectionForm.susu_account_id || !collectionForm.amount}>
              {submitting ? 'Saving...' : 'Record Collection'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Account modal */}
      <Modal open={accountModal} onClose={() => setAccountModal(false)} title="New Susu Account" size="md">
        <div className="space-y-4">
          <Select
            label="Customer *"
            value={accountForm.customer_id}
            onChange={(e) => setAccountForm({ ...accountForm, customer_id: e.target.value })}
          >
            <option value="">Select a customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name} — {c.phone}</option>
            ))}
          </Select>

          <Select
            label="Field Agent *"
            value={accountForm.field_agent_id}
            onChange={(e) => setAccountForm({ ...accountForm, field_agent_id: e.target.value })}
          >
            <option value="">Select an agent...</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.full_name} {a.zone ? `(${a.zone})` : ''}</option>
            ))}
          </Select>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Daily Amount (GHS) *"
              required
              type="number"
              step="0.01"
              min="0"
              value={accountForm.daily_amount}
              onChange={(e) => setAccountForm({ ...accountForm, daily_amount: e.target.value })}
              placeholder="0.00"
            />
            <Input
              label="Start Date *"
              required
              type="date"
              value={accountForm.start_date}
              onChange={(e) => setAccountForm({ ...accountForm, start_date: e.target.value })}
            />
          </div>

          <Textarea
            label="Notes"
            value={accountForm.notes}
            onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })}
            placeholder="Optional notes"
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAccountModal(false)}>Cancel</Button>
            <Button onClick={handleAccountSubmit} disabled={submitting || !accountForm.customer_id || !accountForm.field_agent_id || !accountForm.daily_amount}>
              {submitting ? 'Saving...' : 'Create Account'}
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
