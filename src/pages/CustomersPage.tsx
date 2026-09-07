import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, Plus, Search, Pencil, Trash2, Phone, Mail, MapPin, Eye, UserCog, PiggyBank, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Customer, CustomerStatus, FieldAgent, Transaction } from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime, initials } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner, EmptyState } from '@/components/ui/StatCard';
import { CustomerForm, emptyCustomerForm, customerToForm, type CustomerFormData } from '@/components/forms/CustomerForm';
import { Input, Select } from '@/components/ui/Input';
import { navigate } from '@/lib/router';

const statusColors: Record<CustomerStatus, 'green' | 'slate' | 'red'> = {
  active: 'green',
  inactive: 'slate',
  blacklisted: 'red',
};

interface CustomerWithAgent extends Customer {
  field_agents: Pick<FieldAgent, 'id' | 'full_name' | 'zone'> | null;
}

interface CustomerWithSavings extends CustomerWithAgent {
  total_savings?: number;
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerWithSavings[]>([]);
  const [fieldAgents, setFieldAgents] = useState<FieldAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(emptyCustomerForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    const [custRes, agentRes, savingsRes] = await Promise.all([
      supabase.from('customers').select('*, field_agents(id, full_name, zone)').order('created_at', { ascending: false }),
      supabase.from('field_agents').select('*').eq('status', 'active').order('full_name'),
      supabase.from('customer_savings').select('*'),
    ]);
    const savingsMap = new Map<string, number>();
    for (const s of savingsRes.data ?? []) {
      savingsMap.set((s as { customer_id: string; total_savings: number }).customer_id, Number((s as { total_savings: number }).total_savings));
    }
    const customersWithSavings = ((custRes.data as CustomerWithAgent[]) ?? []).map((c) => ({
      ...c,
      total_savings: savingsMap.get(c.id) ?? 0,
    }));
    setCustomers(customersWithSavings);
    setFieldAgents(agentRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        !search ||
        c.full_name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        (c.email ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [customers, search, statusFilter]);

  const openAdd = () => {
    setEditTarget(null);
    setFormData(emptyCustomerForm);
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditTarget(c);
    setFormData(customerToForm(c));
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload = {
      full_name: formData.full_name,
      phone: formData.phone,
      email: formData.email || null,
      address: formData.address || null,
      national_id: formData.national_id || null,
      occupation: formData.occupation || null,
      monthly_income: formData.monthly_income ? parseFloat(formData.monthly_income) : null,
      status: formData.status,
      field_agent_id: formData.field_agent_id || null,
      notes: formData.notes || null,
    };

    if (editTarget) {
      await supabase.from('customers').update(payload).eq('id', editTarget.id);
    } else {
      await supabase.from('customers').insert(payload);
    }

    setSubmitting(false);
    setModalOpen(false);
    loadCustomers();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('customers').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    loadCustomers();
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blacklisted">Blacklisted</option>
        </select>
        <Button onClick={openAdd}>
          <Plus size={18} />
          Add Customer
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
            icon={<Users size={24} />}
            title="No customers found"
            description={search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Add your first customer to get started.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header">Customer</th>
                  <th className="table-header">Contact</th>
                  <th className="table-header">Occupation</th>
                  <th className="table-header">Savings</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Agent</th>
                  <th className="table-header">Date Added</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-semibold">
                          {initials(c.full_name)}
                        </div>
                        <div>
                          <button
                            onClick={() => navigate(`/customers/${c.id}`)}
                            className="font-medium text-slate-800 hover:text-primary-600 transition text-left"
                          >
                            {c.full_name}
                          </button>
                          {c.customer_number && (
                            <p className="text-xs text-slate-400">{c.customer_number}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-slate-700">{c.phone}</div>
                      <div className="text-xs text-slate-400">{c.email ?? '—'}</div>
                    </td>
                    <td className="table-cell">{c.occupation ?? '—'}</td>
                    <td className="table-cell">
                      <span className={`font-semibold ${Number(c.total_savings) > 0 ? 'text-accent-600' : 'text-slate-400'}`}>
                        {formatCurrency(Number(c.total_savings) || 0)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <Badge color={statusColors[c.status]}>
                        {c.status}
                      </Badge>
                    </td>
                    <td className="table-cell">
                      {c.field_agents ? (
                        <div className="flex items-center gap-1.5">
                          <UserCog size={14} className="text-slate-400" />
                          <span className="text-sm text-slate-700">{c.field_agents.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="table-cell text-slate-500">{formatDateTime(c.created_at)}</td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/customers/${c.id}`)} className="p-1.5 rounded-lg text-slate-400 hover:bg-primary-50 hover:text-primary-600 transition" title="View">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-slate-400 hover:bg-warning-50 hover:text-warning-600 transition" title="Edit">
                          <Pencil size={16} />
                        </button>
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

      {/* Add/Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Customer' : 'Add New Customer'} size="lg">
        <CustomerForm
          data={formData}
          onChange={setFormData}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          submitting={submitting}
          mode={editTarget ? 'edit' : 'add'}
          fieldAgents={fieldAgents}
        />
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Customer" size="sm">
        <p className="text-sm text-slate-600">
          Are you sure you want to delete <span className="font-semibold">{deleteTarget?.full_name}</span>? This will also delete all their loans and repayments. This action cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}

export function CustomerDetailPage({ customerId }: { customerId: string }) {
  const [customer, setCustomer] = useState<(Customer & { field_agents: Pick<FieldAgent, 'id' | 'full_name' | 'zone'> | null }) | null>(null);
  const [loans, setLoans] = useState<Array<{ id: string; loan_number: string | null; principal_amount: number; interest_rate: number; term_months: number; status: string; disbursement_date: string; created_at: string }>>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savings, setSavings] = useState<number>(0);
  const [fieldAgents, setFieldAgents] = useState<FieldAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [formData, setFormData] = useState<CustomerFormData>(emptyCustomerForm);
  const [submitting, setSubmitting] = useState(false);
  const [txnModalOpen, setTxnModalOpen] = useState(false);
  const [txnForm, setTxnForm] = useState({ type: 'deposit' as 'deposit' | 'withdrawal', amount: '', method: 'cash' as 'cash' | 'bank_transfer' | 'mobile_money' | 'cheque', description: '', transaction_date: new Date().toISOString().slice(0, 10) });
  const [txnSubmitting, setTxnSubmitting] = useState(false);
  const [txnError, setTxnError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [cRes, lRes, aRes, txnRes, savRes] = await Promise.all([
      supabase.from('customers').select('*, field_agents(id, full_name, zone)').eq('id', customerId).maybeSingle(),
      supabase.from('loans').select('id, loan_number, principal_amount, interest_rate, term_months, status, disbursement_date, created_at').eq('customer_id', customerId).order('created_at', { ascending: false }),
      supabase.from('field_agents').select('*').eq('status', 'active').order('full_name'),
      supabase.from('transactions').select('*').eq('customer_id', customerId).order('transaction_date', { ascending: false }),
      supabase.from('customer_savings').select('*').eq('customer_id', customerId).maybeSingle(),
    ]);
    setCustomer(cRes.data as (Customer & { field_agents: Pick<FieldAgent, 'id' | 'full_name' | 'zone'> | null }) | null);
    setLoans(lRes.data ?? []);
    setFieldAgents(aRes.data ?? []);
    setTransactions((txnRes.data as Transaction[]) ?? []);
    setSavings(Number((savRes.data as { total_savings?: number } | null)?.total_savings ?? 0));
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = () => {
    if (customer) {
      setFormData(customerToForm(customer));
      setEditOpen(true);
    }
  };

  const handleEdit = async () => {
    if (!customer) return;
    setSubmitting(true);
    const payload = {
      full_name: formData.full_name,
      phone: formData.phone,
      email: formData.email || null,
      address: formData.address || null,
      national_id: formData.national_id || null,
      occupation: formData.occupation || null,
      monthly_income: formData.monthly_income ? parseFloat(formData.monthly_income) : null,
      status: formData.status,
      field_agent_id: formData.field_agent_id || null,
      notes: formData.notes || null,
    };
    await supabase.from('customers').update(payload).eq('id', customer.id);
    setSubmitting(false);
    setEditOpen(false);
    load();
  };

  const handleAddTxn = async () => {
    if (!customer) return;
    setTxnError(null);
    const amount = parseFloat(txnForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setTxnError('Please enter a valid amount greater than zero.');
      return;
    }
    setTxnSubmitting(true);
    const { error } = await supabase.from('transactions').insert({
      type: txnForm.type,
      amount,
      method: txnForm.method,
      description: txnForm.description || null,
      customer_id: customer.id,
      transaction_date: txnForm.transaction_date,
    });
    setTxnSubmitting(false);
    if (error) {
      setTxnError('Could not save the transaction. Please try again.');
      return;
    }
    setTxnModalOpen(false);
    setTxnForm({ type: 'deposit', amount: '', method: 'cash', description: '', transaction_date: new Date().toISOString().slice(0, 10) });
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} />
      </div>
    );
  }

  if (!customer) {
    return (
      <EmptyState icon={<Users size={24} />} title="Customer not found" description="This customer may have been deleted." />
    );
  }

  const totalBorrowed = loans.reduce((s, l) => s + Number(l.principal_amount), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <button onClick={() => navigate('/dashboard')} className="hover:text-slate-600 transition">Dashboard</button>
        <span>/</span>
        <button onClick={() => navigate('/customers')} className="hover:text-slate-600 transition">Customers</button>
        <span>/</span>
        <span className="text-slate-600 font-medium">{customer.full_name}</span>
      </div>

      {/* Profile header */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 text-xl font-bold">
              {initials(customer.full_name)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{customer.full_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                {customer.customer_number && <span className="text-xs font-mono text-primary-600 bg-primary-50 px-2 py-0.5 rounded">{customer.customer_number}</span>}
                <Badge color={statusColors[customer.status]}>{customer.status}</Badge>
                <span className="text-sm text-slate-500">Added {formatDateTime(customer.created_at)}</span>
              </div>
            </div>
          </div>
          <Button variant="secondary" onClick={openEdit}>
            <Pencil size={16} />
            Edit Profile
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200">
          <InfoItem icon={<Phone size={16} />} label="Phone" value={customer.phone} />
          <InfoItem icon={<Mail size={16} />} label="Email" value={customer.email ?? '—'} />
          <InfoItem icon={<MapPin size={16} />} label="Address" value={customer.address ?? '—'} />
          <InfoItem icon={<Users size={16} />} label="National ID" value={customer.national_id ?? '—'} />
          <InfoItem label="Occupation" value={customer.occupation ?? '—'} />
          <InfoItem label="Monthly Income" value={customer.monthly_income ? formatCurrency(Number(customer.monthly_income)) : '—'} />
          <InfoItem label="Total Borrowed" value={formatCurrency(totalBorrowed)} />
          <InfoItem label="Active Loans" value={loans.filter((l) => l.status === 'active').length.toString()} />
          <InfoItem icon={<UserCog size={16} />} label="Field Agent" value={customer.field_agents?.full_name ?? 'Unassigned'} />
          <InfoItem icon={<PiggyBank size={16} />} label="Total Savings" value={formatCurrency(savings)} />
        </div>

        {customer.notes && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-500 mb-1">Notes</p>
            <p className="text-sm text-slate-700">{customer.notes}</p>
          </div>
        )}
      </div>

      {/* Savings & Transactions */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
              <PiggyBank size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">Savings & Transactions</h3>
              <p className="text-sm text-accent-600 font-semibold">Total saved: {formatCurrency(savings)}</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setTxnModalOpen(true)}>
            <Plus size={16} />
            Add Transaction
          </Button>
        </div>
        {transactions.length === 0 ? (
          <EmptyState icon={<PiggyBank size={24} />} title="No transactions yet" description="Record a deposit or withdrawal for this customer." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header">Date</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Description</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="table-cell text-slate-500">{formatDate(t.transaction_date)}</td>
                    <td className="table-cell">
                      <Badge color={t.type === 'deposit' ? 'green' : 'red'}>
                        {t.type === 'deposit' ? <ArrowDownLeft size={12} className="inline mr-1" /> : <ArrowUpRight size={12} className="inline mr-1" />}
                        {t.type}
                      </Badge>
                    </td>
                    <td className="table-cell text-slate-600">{t.description ?? '—'}</td>
                    <td className={`table-cell font-semibold ${t.type === 'deposit' ? 'text-accent-600' : 'text-error-600'}`}>
                      {t.type === 'deposit' ? '+' : '−'}{formatCurrency(Number(t.amount))}
                    </td>
                    <td className="table-cell"><Badge color="slate">{t.method.replace('_', ' ')}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Loans */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-800">Loan History</h3>
          <Button size="sm" onClick={() => navigate('/loans')}>
            <Plus size={16} />
            New Loan
          </Button>
        </div>
        {loans.length === 0 ? (
          <EmptyState icon={<Users size={24} />} title="No loans yet" description="This customer has no loans." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header">Loan #</th>
                  <th className="table-header">Principal</th>
                  <th className="table-header">Rate</th>
                  <th className="table-header">Term</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Created</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition">
                    <td className="table-cell font-medium text-primary-600">{l.loan_number}</td>
                    <td className="table-cell">{formatCurrency(Number(l.principal_amount))}</td>
                    <td className="table-cell">{Number(l.interest_rate).toFixed(2)}%</td>
                    <td className="table-cell">{l.term_months} mo</td>
                    <td className="table-cell text-slate-500">{formatDate(l.disbursement_date)}</td>
                    <td className="table-cell text-slate-400 text-xs">{formatDateTime(l.created_at)}</td>
                    <td className="table-cell">
                      <Badge color={l.status === 'active' ? 'green' : l.status === 'overdue' ? 'red' : l.status === 'repaid' ? 'blue' : 'slate'}>
                        {l.status}
                      </Badge>
                    </td>
                    <td className="table-cell text-right">
                      <button onClick={() => navigate(`/loans/${l.id}`)} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Customer" size="lg">
        <CustomerForm
          data={formData}
          onChange={setFormData}
          onSubmit={handleEdit}
          onCancel={() => setEditOpen(false)}
          submitting={submitting}
          mode="edit"
          fieldAgents={fieldAgents}
        />
      </Modal>

      <Modal open={txnModalOpen} onClose={() => { setTxnModalOpen(false); setTxnError(null); }} title="Add Transaction" size="md">
        <div className="space-y-4">
          {txnError && (
            <div className="rounded-lg bg-error-50 border border-error-200 px-4 py-2.5 text-sm text-error-700">
              {txnError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTxnForm({ ...txnForm, type: 'deposit' })}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${txnForm.type === 'deposit' ? 'border-accent-500 bg-accent-50 text-accent-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <ArrowDownLeft size={18} />
              <span className="font-medium text-sm">Deposit</span>
            </button>
            <button
              onClick={() => setTxnForm({ ...txnForm, type: 'withdrawal' })}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${txnForm.type === 'withdrawal' ? 'border-error-500 bg-error-50 text-error-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
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
            value={txnForm.amount}
            onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value })}
            placeholder="0.00"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Payment Method"
              value={txnForm.method}
              onChange={(e) => setTxnForm({ ...txnForm, method: e.target.value as 'cash' | 'bank_transfer' | 'mobile_money' | 'cheque' })}
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
              value={txnForm.transaction_date}
              onChange={(e) => setTxnForm({ ...txnForm, transaction_date: e.target.value })}
            />
          </div>
          <Input
            label="Description"
            value={txnForm.description}
            onChange={(e) => setTxnForm({ ...txnForm, description: e.target.value })}
            placeholder="What is this transaction for?"
          />
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setTxnModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTxn} disabled={txnSubmitting || !txnForm.amount}>
              {txnSubmitting ? 'Saving...' : 'Save Transaction'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className="text-sm font-medium text-slate-800 mt-0.5">{value}</p>
    </div>
  );
}
